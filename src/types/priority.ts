/** A measurement the estimated priority of an unrated hotspot is made of. */
export type PriorityComponent = 'cell_density' | 'hematoxylin' | 'glcm_contrast' | 'edge_density' | 'entropy';

/** How much each component counts; 0 switches it off. Set by the admin, the same for every organization. */
export type PriorityWeights = Record<PriorityComponent, number>;
