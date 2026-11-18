import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
self.onmessage = async (
  event: MessageEvent<{ image: ImageBitmap; assets: string }>,
) => {
  const { image, assets } = event.data;
  let detector: FaceLandmarker | undefined;
  try {
    const vision = await FilesetResolver.forVisionTasks(assets, true);
    detector = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${assets}/face_landmarker.task`,
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      numFaces: 3,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    const result = detector.detect(image);
    self.postMessage({
      faces: result.faceLandmarks.map((points) =>
        points.map(({ x, y }) => ({ x, y })),
      ),
    });
  } catch {
    self.postMessage({
      error:
        "Chưa nhận diện được khuôn mặt. Bạn vẫn có thể đặt sticker bằng tay.",
    });
  } finally {
    image.close();
    detector?.close();
  }
};
