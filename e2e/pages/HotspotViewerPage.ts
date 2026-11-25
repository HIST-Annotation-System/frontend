import { expect, type Page } from '@playwright/test';

type Tool = 'Poligon' | 'Krzywa' | 'Rysowanie ręczne';

export class HotspotViewerPage {
  constructor(private readonly page: Page) {}

  /**
   * `reannotate` is the mode in which an annotator draws; the default one only rates the hotspot.
   * Resolves once the hotspot image and its annotations have loaded, so the canvas is ready for drawing.
   */
  async goto(hotspotId: string, mode: 'reannotate' | 'rate' = 'reannotate') {
    const loaded = Promise.all([
      this.page.waitForResponse((response) => response.url().includes(`/hotspots/${hotspotId}/image`)),
      this.page.waitForResponse((response) => response.url().includes(`/hotspots/${hotspotId}/annotations`)),
    ]);
    await this.page.goto(`/hotspots/${hotspotId}${mode === 'reannotate' ? '?mode=reannotate' : ''}`);
    await loaded;
  }

  start = () => this.page.getByRole('button', { name: 'Rozpocznij reannotację' }).click();
  confirm = () => this.page.getByRole('button', { name: 'Zatwierdź moje anotacje' }).click();
  unconfirm = () => this.page.getByRole('button', { name: 'Cofnij zatwierdzenie' }).click();

  toolbar = () => this.page.getByRole('toolbar', { name: 'Narzędzia anotacji' });
  tool = (name: Tool | 'Nawigacja' | 'Obszar wyłączony') => this.toolbar().getByRole('button', { name });
  annotationCount = () => this.page.getByText(/^Anotacje\s*\d+/);

  /** Draws a rectangle with the polygon tool: clicks on its corners, then double-clicks the last one to close it. */
  async drawRectangle(tool: Tool = 'Poligon', origin = { x: 0.4, y: 0.4 }, size = { w: 0.2, h: 0.2 }) {
    await this.tool(tool).click();
    const canvas = this.page.locator('.openseadragon-canvas[tabindex="0"]'); // the minimap has a canvas too
    // Drawing only works once Annotorious has laid its layer over the image; under load that can take a moment.
    await expect(this.page.locator('svg.a9s-annotationlayer')).toBeAttached();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('The viewer canvas is not visible');
    const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
    const corners = [
      at(origin.x, origin.y),
      at(origin.x + size.w, origin.y),
      at(origin.x + size.w, origin.y + size.h),
      at(origin.x, origin.y + size.h),
    ];
    // The drawing tool follows the pointer, so move onto each corner before pressing. A double click on the last
    // corner closes the shape but does not add that corner, so it is clicked first.
    for (const corner of corners) {
      await this.page.mouse.move(corner.x, corner.y, { steps: 5 });
      await this.page.mouse.click(corner.x, corner.y);
    }
    const last = corners[corners.length - 1];
    await this.page.mouse.dblclick(last.x, last.y);
  }

  selectedCard = () => this.page.getByLabel('Zaznaczona anotacja');
  expectAnnotations = (count: number) => expect(this.annotationCount()).toHaveText(new RegExp(`Anotacje\\s*${count}`));
}
