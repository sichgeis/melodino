import argparse
from pathlib import Path
import subprocess
import sys

from .core import add, render


def main():
    parser = argparse.ArgumentParser(description='Melodino – instrumentale Notenstimme exportieren')
    sub = parser.add_subparsers(dest='command', required=True)
    for command in ('render', 'add'):
        p = sub.add_parser(command)
        p.add_argument('input', type=Path)
        p.add_argument('--bpm', type=float)
        p.add_argument('--instrument', choices=['bell', 'clarinet'], default='bell')
        p.add_argument('--soundfont', type=Path)
        p.add_argument('--no-audio', action='store_true', help='Nur Notendateien für den Browser, ohne WAV/MP3')
        p.add_argument('--verse-gap-bars', type=int, choices=[0, 1, 2], default=1, help='Zusätzliche Strophenpause im Browser in Takten (Standard: 1)')
        p.add_argument('--transpose', type=int, default=0)
        if command == 'render':
            p.add_argument('--output', type=Path, required=True)
        else:
            p.add_argument('--slug', required=True)
            p.add_argument('--docs', type=Path, default=Path('docs'), help='Katalogverzeichnis (Standard: docs/)')
    args = parser.parse_args()
    kwargs = dict(bpm=args.bpm, voice=args.instrument, soundfont=args.soundfont, transpose=args.transpose, audio=not args.no_audio, verse_gap_bars=args.verse_gap_bars)
    try:
        if args.command == 'add':
            info = add(args.input, args.slug, args.docs, **kwargs)
        else:
            info = render(args.input, args.output, **kwargs)
        print(f"{info['title']}: {info['note_count']} Noten, {info['bpm']:g} BPM, {info['duration_seconds']:.1f} s")
    except Exception as exc:
        # Keep malformed user scores and missing tools actionable without tracebacks.
        detail = exc.stderr.decode(errors='replace')[-600:] if isinstance(exc, subprocess.CalledProcessError) and exc.stderr else str(exc)
        print(f'Fehler: {detail}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
