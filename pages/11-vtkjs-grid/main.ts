import '@kitware/vtk.js/Rendering/Profiles/Volume';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
// @ts-expect-error - vtk.js 36.12.1 ships no .d.ts for this module (Filters/General/ImageMarchingCubes.js has no companion .d.ts)
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {loadGrid} from '@lib/grid';
import {colormap} from '@lib/colormap';

if (requireWebGL2()) {
  let mc: any, rw: any;
  const ui = mountChrome({
    num: '11', title: 'VTK.js — one job',
    expect: 'the same plume as a volume, plus a solid isosurface at the slider temperature. This page never loaded the unstructured mesh; it loaded the regular grid the pipeline wrote.',
    claim: 'Cannot display our simulation meshes at all — it has no concept of that kind of mesh. It stays useful for one thing: if we convert results to a regular grid first, it can draw them.',
    controls: [{kind: 'range', id: 'iso', label: 'Isosurface (°C)', min: 11, max: 34, step: 1, value: 20,
      onChange: v => { mc.setContourValue(v); rw.render(); }}]
  });
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0';
  ui.canvasHost.prepend(container);

  loadGrid().then(grid => {
    const image = vtkImageData.newInstance();
    image.setDimensions(grid.dims);
    image.setOrigin(grid.origin);
    image.setSpacing(grid.spacing);
    image.getPointData().setScalars(vtkDataArray.newInstance({name: 'temperature', values: grid.data, numberOfComponents: 1}));

    // rootContainer is a real runtime option (FullScreenRenderWindow.js model default) but missing from the 36.12.1 .d.ts, which only declares `container`.
    const fs = vtkFullScreenRenderWindow.newInstance({rootContainer: container, containerStyle: {height: '100%', width: '100%', position: 'absolute'}, background: [0.95, 0.95, 0.94]} as any);
    const renderer = fs.getRenderer(); rw = fs.getRenderWindow();

    const ctf = vtkColorTransferFunction.newInstance();
    for (const t of [10, 16, 22, 28, 35]) { const [r, g, b] = colormap(t, 10, 35); ctf.addRGBPoint(t, r / 255, g / 255, b / 255); }
    const ofun = vtkPiecewiseFunction.newInstance();
    ofun.addPoint(10, 0); ofun.addPoint(20, 0.02); ofun.addPoint(35, 0.35);

    const vmapper = vtkVolumeMapper.newInstance(); vmapper.setInputData(image); vmapper.setSampleDistance(8);
    const volume = vtkVolume.newInstance(); volume.setMapper(vmapper);
    volume.getProperty().setRGBTransferFunction(0, ctf); volume.getProperty().setScalarOpacity(0, ofun);
    renderer.addVolume(volume);

    mc = vtkImageMarchingCubes.newInstance({contourValue: 20, computeNormals: true, mergePoints: true});
    mc.setInputData(image);
    const smapper = vtkMapper.newInstance(); smapper.setInputConnection(mc.getOutputPort());
    const actor = vtkActor.newInstance(); actor.setMapper(smapper); actor.getProperty().setColor(0.9, 0.6, 0.1);
    renderer.addActor(actor);

    renderer.resetCamera(); renderer.getActiveCamera().elevation(-50); renderer.resetCameraClippingRange();
    rw.render();
    ui.probe('input: field.grid.f32 via vtkImageData. The 41×41 surface mesh and any tetrahedral mesh were never loaded — vtk.js has no mapper for vtkUnstructuredGrid.');
    ui.probe('the grid conversion in scripts/generate.ts is the one step that feeds both this page and page 10.');
    ui.ready();
  });
}
