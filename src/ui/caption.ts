import type { TourSpec } from '../schema';
import { $ } from '../util';

const AUDIO = import.meta.glob<string>('/ships/*/*.{mp3,ogg,m4a}', { eager: true, query: '?url', import: 'default' });

/** Tour caption box, optional speech narration, optional per-ship audio track. */
export class Captions {
  private narrate = false;
  private audio: HTMLAudioElement | null = null;

  constructor(private tour: TourSpec, shipDir: string) {
    if (tour.audio) {
      const url = AUDIO[`/ships/${shipDir}/${tour.audio}`];
      if (url) { this.audio = new Audio(url); this.audio.preload = 'none'; }
    }
    const hasVoice = 'speechSynthesis' in window;
    $('#narrateWrap').style.display = hasVoice || this.audio ? '' : 'none';
    $<HTMLInputElement>('#optNarrate').addEventListener('change', e => {
      this.narrate = (e.target as HTMLInputElement).checked;
      if (!this.narrate) this.silence();
    });
  }

  show(on: boolean) {
    $('#caption').classList.toggle('show', on);
    if (!on) this.silence();
  }

  segment(i: number, t: number) {
    const sg = this.tour.segments[i];
    $('#capIdx').textContent = `${String(i + 1).padStart(2, '0')} / ${String(this.tour.segments.length).padStart(2, '0')}`;
    $('#capName').textContent = sg.name;
    $('#capText').textContent = sg.caption ?? '';
    $('#caption').classList.toggle('nocap', !sg.caption);
    if (!this.narrate) return;
    if (this.audio) {
      if (this.audio.paused) { this.audio.currentTime = t * this.tour.duration; void this.audio.play().catch(() => {}); }
    } else if (sg.caption && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(sg.caption);
      u.rate = 1.02; u.pitch = .95;
      speechSynthesis.speak(u);
    }
  }

  progress(t: number) { $('#capProg').style.transform = `scaleX(${t.toFixed(4)})`; }

  private silence() {
    this.audio?.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}
