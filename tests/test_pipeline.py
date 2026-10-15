import json
from pathlib import Path
import shutil
import subprocess
import wave

import numpy as np
import pytest
from music21 import chord, converter, instrument, meter, midi, note, stream, tie

from notenstimme.core import add, events, find_soundfont, load_song, prepare, render

EXAMPLE = Path(__file__).resolve().parents[1] / 'examples/schlaf-kindlein-schlaf.json'


def midi_events(path):
    parsed = converter.parse(str(path), quantizePost=False)
    return [(float(n.offset), int(n.pitch.midi), float(n.quarterLength)) for n in parsed.flatten().notes]


def assert_audio(path):
    with wave.open(str(path)) as f:
        assert f.getframerate() == 44100
        width = f.getsampwidth()
        assert width == 2
        data = np.frombuffer(f.readframes(f.getnframes()), dtype='<i2')
    assert np.max(np.abs(data.astype(float))) > 1000
    assert np.sqrt(np.mean(data.astype(float) ** 2)) > 100
    assert np.max(np.abs(data.astype(float))) < 32767


def test_corrected_reference():
    song = load_song(EXAMPLE)
    assert len(song.score.parts[0].getElementsByClass(stream.Measure)) == 10
    assert song.score.highestTime == 40
    assert len(song.score.recurse().notes) == 30
    fifth = song.score.parts[0].measure(5)
    assert [n.nameWithOctave for n in fifth.notes] == ['B-4', 'B-4', 'G4', 'G4']
    assert [n.pitch.midi for n in fifth.notes] == [70, 70, 67, 67]
    assert all(m.duration.quarterLength == 4 for m in song.score.parts[0].getElementsByClass(stream.Measure))


@pytest.mark.parametrize('duration', [0, -1, float('nan'), float('inf'), True, '1', .5])
def test_invalid_measure(tmp_path, duration):
    data = json.loads(EXAMPLE.read_text())
    data['measures'][0][0][1] = duration
    path = tmp_path / 'bad.json'
    path.write_text(json.dumps(data))
    with pytest.raises(ValueError):
        load_song(path)


def test_midi_tempo_transposition_and_audio(tmp_path):
    base = tmp_path / 'base'
    faster = tmp_path / 'faster'
    info = render(EXAMPLE, base, bpm=88)
    transposed = render(EXAMPLE, faster, bpm=104, transpose=-2)
    assert_audio(base / 'melody.wav')
    assert_audio(faster / 'melody.wav')
    assert info['score_duration_seconds'] == pytest.approx(40 * 60 / 88)
    assert transposed['score_duration_seconds'] == pytest.approx(40 * 60 / 104)
    assert transposed['duration_seconds'] < info['duration_seconds']
    expected = events(load_song(EXAMPLE).score)
    original = midi_events(base / 'melody.mid')
    shifted = midi_events(faster / 'melody.mid')
    assert len(original) == len(shifted) == 30
    for (onset, pitch, duration), exp, changed in zip(original, expected, shifted):
        assert onset == pytest.approx(exp[0], abs=.002)
        assert pitch == exp[2]
        assert duration == pytest.approx(exp[1], abs=.002)
        assert changed[1] == pitch - 2
        assert changed[2] == pytest.approx(duration)
    parsed = converter.parse(str(faster / 'melody.mid'))
    assert parsed.metronomeMarkBoundaries()[0][2].number == pytest.approx(104, abs=.01)
    if shutil.which('ffmpeg'):
        for folder in (base, faster):
            assert (folder / 'melody.mp3').stat().st_size > 1000
            decoded = folder / 'decoded.wav'
            subprocess.run(['ffmpeg', '-v', 'error', '-i', str(folder / 'melody.mp3'), '-acodec', 'pcm_s16le', str(decoded)], check=True)
            assert_audio(decoded)


def test_clarinet_concert_pitch(tmp_path):
    score, _ = prepare(load_song(EXAMPLE), 104, 'clarinet', 0)
    assert score.parts[0].getInstrument().midiProgram == 71
    assert score.parts[0].getInstrument().transposition is None
    assert [e[2] for e in events(score)] == [e[2] for e in events(load_song(EXAMPLE).score)]
    if not shutil.which('fluidsynth'):
        pytest.skip('FluidSynth fehlt')
    try:
        sf = find_soundfont()
    except ValueError:
        pytest.skip('GM-SF2 fehlt')
    info = render(EXAMPLE, tmp_path, bpm=104, voice='clarinet', soundfont=sf)
    assert_audio(tmp_path / 'melody.wav')
    assert [e[1] for e in midi_events(tmp_path / 'melody.mid')] == [e[2] for e in events(score)]
    mf = midi.MidiFile()
    mf.open(str(tmp_path / 'melody.mid'))
    mf.read()
    mf.close()
    assert 71 in [e.data for t in mf.tracks for e in t.events if e.type == midi.ChannelVoiceMessages.PROGRAM_CHANGE]
    assert info['instrument'] == 'clarinet'


def test_no_ffmpeg_and_replacement(tmp_path, monkeypatch):
    monkeypatch.setattr('notenstimme.core.shutil.which', lambda _: None)
    docs = tmp_path / 'docs'
    with pytest.warns(UserWarning, match='FFmpeg'):
        first = add(EXAMPLE, 'mein-lied', docs, bpm=88)
    with pytest.warns(UserWarning, match='FFmpeg'):
        add(EXAMPLE, 'zweites-lied', docs)
    # Simulate stale MP3 from an older export: replacing removes it.
    stale = docs / 'assets/mein-lied/melody.mp3'
    stale.write_text('old')
    with pytest.warns(UserWarning, match='FFmpeg'):
        add(EXAMPLE, 'mein-lied', docs, bpm=104)
    catalog = json.loads((docs / 'library.json').read_text())
    assert len(catalog) == 2
    assert next(s for s in catalog if s['slug'] == 'mein-lied')['bpm'] == 104
    assert not stale.exists()
    assert 'mp3' not in first['files']
    for song in catalog:
        for file in song['files'].values():
            assert (docs / file).is_file()
            assert (docs / file).resolve().is_relative_to(docs.resolve())
    before = (docs / 'library.json').read_bytes()
    with pytest.raises(ValueError):
        add(EXAMPLE, 'mein-lied', docs, bpm=-1)
    assert (docs / 'library.json').read_bytes() == before
    assert (docs / 'assets/mein-lied/melody.wav').is_file()


@pytest.mark.parametrize('slug', ['../oops', '/tmp/oops', 'a/b', 'x\\y', 'a--b', '-a', 'a-', 'a b', 'Ä', '', 'x' * 81, 'a?b', '%2e%2e'])
def test_safe_slugs(tmp_path, slug):
    with pytest.raises(ValueError, match='Slug'):
        add(EXAMPLE, slug, tmp_path)


def test_musicxml_chords_ties_and_transposing_input(tmp_path):
    score = stream.Score()
    part = stream.Part()
    clarinet = instrument.Clarinet()
    part.insert(0, clarinet)
    part.insert(0, meter.TimeSignature('4/4'))
    a = chord.Chord(['C5', 'E5'], quarterLength=4)
    a.tie = tie.Tie('start')
    b = chord.Chord(['C5', 'E5'], quarterLength=4)
    b.tie = tie.Tie('stop')
    part.append(a)
    part.append(b)
    score.insert(0, part)
    score.atSoundingPitch = False
    path = tmp_path / 'complex.musicxml'
    score.write('musicxml', fp=str(path))
    loaded = load_song(path)
    assert sorted({e[2] for e in events(loaded.score)}) == [70, 74]
    merged = events(loaded.score, True)
    assert len(merged) == 2
    assert all(e[1] == 8 for e in merged)
    info = render(path, tmp_path / 'out')
    assert info['note_count'] == 2
    assert_audio(tmp_path / 'out/melody.wav')


def test_published_catalog():
    docs = EXAMPLE.parents[1] / 'docs'
    path = docs / 'library.json'
    if not path.exists():
        pytest.skip('Hörproben noch nicht generiert')
    songs = json.loads(path.read_text())
    assert len(songs) >= 2
    for song in songs:
        assert song['note_count'] == 30
        assert song['quarters'] == 40
        for kind, file in song['files'].items():
            assert file.startswith(f"assets/{song['slug']}/")
            assert (docs / file).stat().st_size > 0
        assert_audio(docs / song['files']['wav'])
