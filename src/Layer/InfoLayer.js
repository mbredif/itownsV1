import Extent from 'Core/Geographic/Extent';
import OBB from 'Renderer/OBB';
import { Box3, Matrix4 } from 'three';


const boxNearFar = new Box3();
const matrix = new Matrix4();

const displayedTilesObb = new OBB();

export default class InfoLayer {
    constructor(layer) {
        this.layer = layer;
    }
    // eslint-disable-next-line
    clear() {}
    // eslint-disable-next-line
    update() {}
}


/**
 * InfoTiledGeometryLayer that provides some states layer informations. These
 * informations are displayed tiles, displayed {@link ColorLayer} and {@link
 * ElevationLayer} and extent of displayed tiles.
 *
 * @class InfoTiledGeometryLayer
 *
 * @property {object} displayed
 * @property {Layer[]} displayed.layers - Displayed {@link ColorLayer} and {@link ElevationLayer}.
 * @property {Extent} displayed.extent - {@link Extent} of displayed tiles.
 * @property {Set} displayed.tiles - Set of displayed tiles.
 */
export class InfoTiledGeometryLayer extends InfoLayer {
    constructor(tiledGeometryLayer) {
        super(tiledGeometryLayer);
        this.displayed = { tiles: new Set() };
        Object.defineProperty(
            this.displayed,
            'layers',
            {
                get: () => {
                    let layers = [];
                    this.displayed.tiles.forEach((tile) => {
                        const m = tile.material;
                        layers = [...new Set([...layers, ...m.colorLayerIds.filter(id => m.getLayer(id)), ...m.elevationLayerIds])];
                    });

                    return this.layer.attachedLayers.filter(l => layers.includes(l.id));
                },
            });
        Object.defineProperty(
            this.displayed,
            'extent',
            {
                get: () => {
                    const extent = new Extent(this.layer.extent.crs, Infinity, -Infinity, Infinity, -Infinity);
                    extent.min = +Infinity;
                    extent.max = -Infinity;
                    this.displayed.tiles.forEach((tile) => {
                        extent.union(tile.extent);
                        extent.min = Math.min(tile.obb.z.min, extent.min);
                        extent.max = Math.max(tile.obb.z.max, extent.max);
                    });

                    return extent;
                },
            });
    }

    getNearFar(camera) {
        if (this.displayed.extent.west == Infinity) {
            return { near: 0, far: Infinity };
        }
        displayedTilesObb.setFromExtent(this.displayed.extent);

        // Note Method to compute near and far...
        boxNearFar.copy(displayedTilesObb.box3D);
        matrix.multiplyMatrices(camera.matrixWorldInverse, displayedTilesObb.matrixWorld);
        boxNearFar.applyMatrix4(matrix);
        const error = Math.abs(boxNearFar.max.z - boxNearFar.min.z) * 0.1;
        const result = {
            far: -boxNearFar.min.z + error,
            near: -boxNearFar.max.z - error,
        };

        return result;
    }

    get currentMaxTileZoom() {
        let zoom = -1;
        this.displayed.tiles.forEach((t) => {
            if (t.extent.zoom > zoom) {
                zoom = t.extent.zoom;
            }
        });
        return zoom;
    }

    clear() {
        this.displayed.tiles.clear();
    }

    update(tile) {
        if (tile.material.visible) {
            this.displayed.tiles.add(tile);
        } else {
            this.displayed.tiles.delete(tile);
        }
    }
}
