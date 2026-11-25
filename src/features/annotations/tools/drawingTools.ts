import { mountPlugin } from '@annotorious/plugin-tools';
import '@annotorious/plugin-tools/annotorious-plugin-tools.css';
import type { ToolMode } from '../../../types/annotation';
import type { SlideAnnotator } from '../hooks/useSlideAnnotator';
import { FreehandTool } from './FreehandTool';
import { createSmoothPathTool } from './SmoothPathTool';

type DrawingMode = Exclude<ToolMode, 'navigate'>;

export const DRAWING_TOOLS: Record<DrawingMode, string> = {
  polygon: 'path',
  curve: 'smooth-path',
  freehand: 'freehand',
};

type ToolComponent = Parameters<SlideAnnotator['registerDrawingTool']>[1];

/** Registers the drawing tools and the path editor; must run before the tool is set (unknown tools throw). */
export const registerDrawingTools = (anno: SlideAnnotator): void => {
  // The plugin does not export its path tool: it is picked up while mountPlugin registers it.
  let pathTool: ToolComponent | undefined;
  mountPlugin({
    ...anno,
    registerDrawingTool: (name, tool, opts) => {
      if (name === DRAWING_TOOLS.polygon) pathTool = tool;
      anno.registerDrawingTool(name, tool, opts);
    },
  });
  if (pathTool) {
    const curveTool = createSmoothPathTool(pathTool as unknown as Parameters<typeof createSmoothPathTool>[0]);
    anno.registerDrawingTool(DRAWING_TOOLS.curve, curveTool as unknown as ToolComponent);
  }
  anno.registerDrawingTool(DRAWING_TOOLS.freehand, FreehandTool as unknown as ToolComponent, {
    drawingMode: 'drag',
    viewer: anno.viewer,
  });
};
