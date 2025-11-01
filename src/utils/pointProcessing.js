import { logProgress, logSuccess } from "../ui/react/hooks/useLogging.js";
import { setup2DView } from "./viewHelpers.js";

// ----------------------------------------------------------------------------
// Point Processing Functions
// ----------------------------------------------------------------------------

export async function extractPointsFromPolyData(polyData) {
  const points = polyData.getPoints();
  if (!points) return null;

  const pointsArray = points.getData();
  const numPoints = points.getNumberOfPoints();

  logProgress(`Extracting ${numPoints.toLocaleString()} points...`);

  const pointsMatrix = [];
  for (let i = 0; i < numPoints; i++) {
    const point = [
      pointsArray[i * 3],
      pointsArray[i * 3 + 1],
      pointsArray[i * 3 + 2],
    ];
    pointsMatrix.push(point);
  }

  return pointsMatrix;
}

export function applyReductionToPolyData(polyData, reducedPoints) {
  logProgress("Applying transformed points to visualization...");

  const points = polyData.getPoints();
  const pointsArray = points.getData();
  const numPoints = points.getNumberOfPoints();

  // Check if this is a 2D result (all Z coordinates are 0)
  const is2D = reducedPoints.every(
    (point) => point.length >= 3 && point[2] === 0
  );

  for (let i = 0; i < numPoints; i++) {
    pointsArray[i * 3] = reducedPoints[i][0];
    pointsArray[i * 3 + 1] = reducedPoints[i][1];
    pointsArray[i * 3 + 2] =
      reducedPoints[i].length > 2 ? reducedPoints[i][2] : 0;
  }

  points.setData(pointsArray);
  points.modified();
  polyData.modified();
  polyData.getBounds();

  if (is2D) {
    logSuccess("Applied 2D visualization - all points in XY plane (Z=0)");
    // Set up 2D viewing - position camera to look down at XY plane
    setup2DView();
  } else {
    logSuccess("Applied 3D visualization with transformed points");
  }
}
