/**
 * vtk.js 36.12.1 ships no .d.ts for these two modules. Only what the bench
 * calls is declared.
 */
declare module '@kitware/vtk.js/Filters/General/ImageMarchingCubes' {
  import type vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
  import type vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
  export interface vtkImageMarchingCubes {
    setInputData(data: vtkImageData, port?: number): void;
    getOutputData(): vtkPolyData;
    setContourValue(v: number): boolean;
    getOutputPort(): unknown;
    delete(): void;
  }
  const vtkImageMarchingCubes: {
    newInstance(init?: {contourValue?: number; computeNormals?: boolean; mergePoints?: boolean}): vtkImageMarchingCubes;
  };
  export default vtkImageMarchingCubes;
}

declare module '@kitware/vtk.js/Filters/General/ImageMarchingCubes/caseTable' {
  const caseTable: {getCase(index: number): number[]; getEdge(id: number): [number, number]};
  export default caseTable;
}
