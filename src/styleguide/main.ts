// The proof sheet (dev only, not part of the build).

import { boot, fontsReady, startDebug } from '../boot';
import './styleguide.css';
import { initSamplePlate } from './sample-plate';
import { initMaterials } from './materials';
import { initEases } from './eases-proof';

const flags = boot();

const sample = initSamplePlate(document.querySelector<HTMLElement>('[aria-labelledby="proof-plate"]')!);
const materials = initMaterials(document.querySelector<HTMLElement>('[aria-labelledby="proof-materials"]')!, flags);
initEases(document.querySelector<HTMLElement>('[data-eases]')!);

const ready = fontsReady().then(
  () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
);

// Hooks for the screenshot script.
Object.assign(window, {
  __tile: {
    ready,
    printTo: (p: number) => sample.seek(p),
    materialsTo: (p: number) => materials.seek(p),
  },
});

startDebug(flags);
