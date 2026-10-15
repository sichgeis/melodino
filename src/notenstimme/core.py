"""Validated concert-pitch scores, deterministic audio and portable exports."""
from __future__ import annotations

import csv
import json
import math
import os
import re
import shutil
import subprocess
import tempfile
import warnings
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from music21 import chord, converter, instrument, key, metadata, meter, note, stream, tempo

RATE = 44100
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
PITCH = re.compile(r"[A-G](?:#{1,2}|-{1,2})?[0-9]\Z")


@dataclass
class Song:
    score: stream.Score
    title: str
    source: str


def positive(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
        raise ValueError(f"{label} muss eine positive, endliche Zahl sein.")
    return float(value)


def load_song(path: Path) -> Song:
    if path.suffix.lower() == '.json':
        data = json.loads(path.read_text(encoding='utf-8'))
        if not isinstance(data, dict) or not isinstance(data.get('title'), str) or not data['title'].strip():
            raise ValueError('JSON benötigt einen Titel.')
        ts = meter.TimeSignature(data['meter'])
        score = stream.Score()
        part = stream.Part()
        measures = data.get('measures')
        if not isinstance(measures, list) or not measures:
            raise ValueError('Keine Takte vorhanden.')
        for number, entries in enumerate(measures, 1):
            bar = stream.Measure(number=number)
            if number == 1:
                bar.insert(0, ts)
                bar.insert(0, key.Key(data['key']))
            total = 0.0
            if not isinstance(entries, list) or not entries:
                raise ValueError(f'Takt {number} ist leer.')
            for entry in entries:
                if not isinstance(entry, list) or len(entry) != 2:
                    raise ValueError(f'Ungültiger Eintrag in Takt {number}.')
                pitch, duration = entry
                duration = positive(duration, 'Dauer')
                if not isinstance(pitch, str) or (pitch != 'rest' and not PITCH.fullmatch(pitch)):
                    raise ValueError(f'Ungültiger Ton {pitch!r}; z. B. B-4, B4 oder rest verwenden.')
                n = note.Rest() if pitch == 'rest' else note.Note(pitch)
                if not n.isRest and not 0 <= n.pitch.midi <= 127:
                    raise ValueError('Ton außerhalb des MIDI-Bereichs.')
                n.quarterLength = duration
                bar.append(n)
                total += duration
            if not math.isclose(total, float(ts.barDuration.quarterLength), abs_tol=1e-8):
                raise ValueError(f'Takt {number}: {total:g} statt {ts.barDuration.quarterLength} Viertel.')
            part.append(bar)
        score.insert(0, part)
        score.insert(0, tempo.MetronomeMark(number=positive(data.get('bpm', 88), 'Tempo')))
        title, source = data['title'], data.get('source', '')
        if not isinstance(source, str):
            raise ValueError('Quelle muss Text sein.')
    elif path.suffix.lower() in {'.musicxml', '.xml', '.mxl'}:
        score = converter.parse(str(path))
        score = score.expandRepeats()
        score = score.toSoundingPitch()
        title = (
            (score.metadata.title or score.metadata.movementName)
            if score.metadata else None
        ) or path.stem
        source = 'Aus MusicXML importiert'
    else:
        raise ValueError('Eingabe muss JSON oder MusicXML sein.')
    if not list(score.recurse().notes):
        raise ValueError('Die Partitur enthält keine Noten.')
    return Song(score, title, source)


def prepare(song: Song, bpm: float | None, voice: str, transpose: int):
    score = song.score.transpose(transpose)
    marks = list(score.recurse().getElementsByClass(tempo.MetronomeMark))
    default_bpm = marks[0].getQuarterBPM() if marks else 88
    bpm = positive(bpm if bpm is not None else (default_bpm or 88), 'Tempo')
    for cls in (tempo.TempoIndication, instrument.Instrument):
        for obj in list(score.recurse().getElementsByClass(cls)):
            obj.activeSite.remove(obj)
    for part in score.parts:
        # A generic Instrument intentionally has no written-pitch transposition.
        inst = instrument.Instrument()
        inst.instrumentName = 'Klarinette' if voice == 'clarinet' else 'Glockenklang'
        inst.midiProgram = 71 if voice == 'clarinet' else 10
        part.insert(0, inst)
    score.insert(0, tempo.MetronomeMark(number=bpm))
    score.metadata = metadata.Metadata(title=song.title)
    score.atSoundingPitch = True
    for n in score.recurse().notes:
        for p in n.pitches:
            if not 0 <= p.ps <= 127 or p.ps != int(p.ps):
                raise ValueError('Nur ganzzahlige MIDI-Tonhöhen 0–127 werden unterstützt.')
    return score, bpm


def events(score, merge_ties=False):
    source = score.stripTies() if merge_ties else score
    result = []
    for n in source.recurse().notesAndRests:
        offset = float(n.getOffsetInHierarchy(source))
        pitches = [None] if n.isRest else [int(p.midi) for p in n.pitches]
        names = ['rest'] if n.isRest else [p.nameWithOctave for p in n.pitches]
        for pitch, name in zip(pitches, names):
            result.append((offset, float(n.quarterLength), pitch, name, n.measureNumber))
    return sorted(result, key=lambda e: (e[0], e[2] if e[2] is not None else -1))


def write_wav(path, samples):
    with wave.open(str(path), 'wb') as out:
        out.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        out.writeframes((np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes())


def bell_audio(score, bpm, path):
    seconds_per_quarter = 60 / bpm
    length = float(score.highestTime) * seconds_per_quarter
    samples = np.zeros(math.ceil((length + .5) * RATE))
    for offset, duration, pitch, _, _ in events(score, merge_ties=True):
        if pitch is None:
            continue
        seconds = duration * seconds_per_quarter
        t = np.arange(max(1, round(seconds * RATE))) / RATE
        freq = 440 * 2 ** ((pitch - 69) / 12)
        signal = sum(amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t * decay)
                     for ratio, amp, decay in [(1, 1, 2), (2, .35, 3), (3, .12, 5)])
        attack = np.minimum(t / .006, 1)
        release = np.clip((seconds - t) / .035, 0, 1)
        start = round(offset * seconds_per_quarter * RATE)
        samples[start:start + len(t)] += signal * attack * release
    peak = np.max(np.abs(samples))
    if peak:
        samples *= .85 / peak
    write_wav(path, samples)


def find_soundfont(explicit=None):
    if explicit:
        path = Path(explicit).expanduser()
        if not path.is_file():
            raise ValueError(f'SoundFont nicht gefunden: {path}')
        return path.resolve()
    candidates = [os.environ.get('MELODINO_SOUNDFONT', ''),
                  '/opt/homebrew/share/soundfonts/default.sf2',
                  '/opt/homebrew/share/sounds/sf2/FluidR3_GM.sf2',
                  '/usr/share/sounds/sf2/FluidR3_GM.sf2',
                  str(Path.home() / 'Library/Audio/Sounds/Banks/FluidR3_GM.sf2')]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return Path(candidate).resolve()
    raise ValueError('GM-SF2 fehlt. --soundfont /pfad/GM.sf2 oder MELODINO_SOUNDFONT setzen.')


def clarinet_audio(score, bpm, soundfont, output):
    if not shutil.which('fluidsynth'):
        raise ValueError('FluidSynth fehlt. macOS: brew install fluidsynth')
    font = find_soundfont(soundfont)
    # MIDI for rendering is separate from the editable, full-duration export.
    articulated = score.stripTies()
    for n in articulated.recurse().notes:
        n.quarterLength = max(.001, float(n.quarterLength) - min(.08, float(n.quarterLength) * .1))
    with tempfile.TemporaryDirectory() as temp:
        midi = Path(temp) / 'articulated.mid'
        articulated.write('midi', fp=str(midi))
        subprocess.run(['fluidsynth', '-ni', '-g', '0.65', '-R', '0', '-C', '0',
                        '-r', str(RATE), '-T', 'wav', '-F', str(output), str(font), str(midi)],
                       check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    # FluidSynth may include MIDI lead-in; music21's MIDI starts at t=0.
    return font.name


def render(input_path, output, bpm=None, voice='bell', soundfont=None, transpose=0):
    if voice not in {'bell', 'clarinet'}:
        raise ValueError('Unbekanntes Instrument.')
    song = load_song(Path(input_path))
    score, bpm = prepare(song, bpm, voice, transpose)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    # Rendering into a fresh directory avoids stale MP3 after a WAV-only rerender.
    for name in ('melody.mp3', 'melody.wav', 'melody.mid', 'score.musicxml', 'notes.csv', 'info.json'):
        (output / name).unlink(missing_ok=True)
    # Preserve incomplete pickup/final measures; do not fill them with hidden rests.
    score.write('musicxml', fp=str(output / 'score.musicxml'), makeNotation=False)
    score.write('midi', fp=str(output / 'melody.mid'))
    with (output / 'notes.csv').open('w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['measure', 'onset_quarters', 'pitch', 'duration_quarters'])
        for offset, duration, _, name, measure in events(score):
            writer.writerow([measure, offset, name, duration])
    font_name = None
    if voice == 'bell':
        bell_audio(score, bpm, output / 'melody.wav')
    else:
        font_name = clarinet_audio(score, bpm, soundfont, output / 'melody.wav')
    files = {'wav': 'melody.wav', 'midi': 'melody.mid', 'musicxml': 'score.musicxml', 'csv': 'notes.csv'}
    if shutil.which('ffmpeg'):
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(output / 'melody.wav'),
                        '-codec:a', 'libmp3lame', '-q:a', '2', str(output / 'melody.mp3')], check=True)
        files['mp3'] = 'melody.mp3'
    else:
        warnings.warn('FFmpeg fehlt: WAV verfügbar, MP3 ausgelassen. macOS: brew install ffmpeg')
    with wave.open(str(output / 'melody.wav')) as wav:
        audio_duration = wav.getnframes() / wav.getframerate()
    info = dict(title=song.title, source=song.source, bpm=bpm, instrument=voice,
                duration_seconds=audio_duration, score_duration_seconds=float(score.highestTime) * 60 / bpm,
                quarters=float(score.highestTime), note_count=sum(e[2] is not None for e in events(score, True)),
                transpose=transpose, files=files)
    if font_name:
        info['soundfont'] = font_name
    (output / 'info.json').write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return info


def add(input_path, slug, docs, **kwargs):
    import fcntl
    if not SLUG.fullmatch(slug) or len(slug) > 80:
        raise ValueError('Slug: maximal 80 Zeichen, nur a-z, 0-9 und einzelne Bindestriche.')
    docs = Path(docs)
    assets = docs / 'assets'
    assets.mkdir(parents=True, exist_ok=True)
    # Stage complete output before touching an existing song or the catalog.
    with tempfile.TemporaryDirectory(prefix='.melodino-', dir=assets) as temp:
        stage = Path(temp) / 'new'
        info = render(input_path, stage, **kwargs)
        info['slug'] = slug
        info['files'] = {kind: f'assets/{slug}/{name}' for kind, name in info['files'].items()}
        # Lock the directory inode; no persistent lock artifact on the website.
        lock = os.open(assets, os.O_RDONLY)
        try:
            fcntl.flock(lock, fcntl.LOCK_EX)
            catalog_path = docs / 'library.json'
            catalog = json.loads(catalog_path.read_text()) if catalog_path.exists() else []
            if not isinstance(catalog, list):
                raise ValueError('library.json muss eine Liste enthalten.')
            catalog = [s for s in catalog if s['slug'] != slug] + [info]
            catalog.sort(key=lambda s: (s['title'], s['slug']))
            staged_catalog = Path(temp) / 'library.json'
            staged_catalog.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            target = assets / slug
            backup = Path(temp) / 'old'
            if target.is_symlink():
                raise ValueError('Zielverzeichnis darf kein Symlink sein.')
            existed = target.exists()
            if existed:
                target.rename(backup)
            try:
                stage.rename(target)
                os.replace(staged_catalog, catalog_path)
            except BaseException:
                if target.exists():
                    shutil.rmtree(target)
                if existed:
                    backup.rename(target)
                raise
        finally:
            os.close(lock)
    return info
