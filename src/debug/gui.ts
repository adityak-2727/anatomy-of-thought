// ?debug: live tuning for colours, eases, exposure and fields. Loaded only on demand.

import GUI from 'lil-gui';
import { PALETTE_TOKENS, allFields, refreshBackground, tuning } from '../gl/background';
import { EASE_NAMES, defineEase, easePath, live } from '../motion/eases';
import { getLenis } from '../motion/scroll';

export function initDebug(): GUI {
  const gui = new GUI({ title: 'Atlas tuning' });
  const root = document.documentElement;

  const palette = gui.addFolder('Palette');
  const css = getComputedStyle(root);
  const colours: Record<string, string> = {};
  for (const token of PALETTE_TOKENS) {
    colours[token] = css.getPropertyValue(token).trim();
    palette.addColor(colours, token).onChange((value: string) => {
      root.style.setProperty(token, value);
      refreshBackground();
    });
  }
  palette.close();

  const eases = gui.addFolder('Eases (CustomEase paths)');
  const paths: Record<string, string> = {};
  for (const name of EASE_NAMES) {
    paths[name] = easePath(name);
    eases.add(paths, name).onFinishChange((value: string) => {
      try {
        defineEase(name, value);
      } catch (error) {
        console.warn(`Ease "${name}" was not changed: ${String(error)}`);
      }
    });
  }

  const motion = gui.addFolder('Motion');
  motion.add(live, 'penSpeed', 300, 2000, 10).name('pen speed (px/s)');
  motion.add(live, 'lenisLerp', 0.04, 0.3, 0.005).name('Lenis lerp').onChange((v: number) => {
    const lenis = getLenis();
    if (lenis) lenis.options.lerp = v;
  });
  motion.add(live, 'loupeLerp', 0.05, 1, 0.01).name('loupe lerp');

  const exposure = gui.addFolder('Paper and exposure');
  exposure.add(tuning, 'paperFibres', 0, 1, 0.01).onChange(refreshBackground);
  exposure.add(tuning, 'paperBlotches', 0, 1.5, 0.01).onChange(refreshBackground);
  exposure.add(tuning, 'paperGrain', 0, 0.05, 0.001).onChange(refreshBackground);
  exposure.add(tuning, 'edgeRoughness', 0, 20, 0.5).name('edge roughness (px)').onChange(refreshBackground);
  exposure.add(tuning, 'streaks', 0, 0.6, 0.01).onChange(refreshBackground);
  exposure.add(tuning, 'unevenness', 0, 1.2, 0.01).onChange(refreshBackground);
  exposure.add(tuning, 'pockets', 0, 1, 0.01).name('deep pockets').onChange(refreshBackground);

  const fieldsFolder = gui.addFolder('Fields');
  allFields().forEach((field, i) => {
    const folder = fieldsFolder.addFolder(field.el.dataset.fieldName ?? `Field ${i + 1}`);
    const redraw = () => field.invalidate();
    folder.add(field.state, 'brush', 0, 1, 0.001).onChange(redraw).listen();
    folder.add(field.state, 'exposure', 0, 1, 0.001).onChange(redraw).listen();
    folder.add(field.state, 'tone', 0, 1, 0.001).onChange(redraw).listen();
    folder.add(field.style, 'seed', 1, 9999, 1).onChange(redraw);
    folder.add(field.style, 'angle', -30, 30, 0.5).name('angle (deg)').onChange(redraw);
    folder.add(field.style, 'strokes', 1, 6, 1).onChange(redraw);
    folder.add(field.style, 'overshoot', 0, 40, 0.5).name('overshoot (px)').onChange(redraw);
    folder.add(field.style, 'bias', 0, 1.5, 0.01).name('centre first').onChange(redraw);
    folder.close();
  });

  gui.add(
    {
      copy: () => {
        const settings = { eases: paths, colours, tuning, live, fields: allFields().map((f) => ({ name: f.el.dataset.fieldName, ...f.style })) };
        const text = JSON.stringify(settings, null, 2);
        void navigator.clipboard?.writeText(text);
        console.info(text);
      },
    },
    'copy',
  ).name('Copy settings as JSON');

  return gui;
}
