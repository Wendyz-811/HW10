const video = document.getElementById('video');
const videoContainer = document.getElementById('video-container');
const emotionOutput = document.getElementById('emotion-output');
const generateBtn = document.getElementById('generate-btn');
const memeImage = document.getElementById('meme');

let currentEmotions = {};

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/static/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/static/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/static/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/static/models')
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => console.error("Camera error:", err));
}

video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  videoContainer.appendChild(canvas);

  const displaySize = {
    width: video.videoWidth,
    height: video.videoHeight
  };

  canvas.width = displaySize.width;
  canvas.height = displaySize.height;

  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    if (detections.length > 0) {
      currentEmotions = detections[0].expressions;
      const top2 = Object.entries(currentEmotions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(e => `${e[0]} (${(e[1] * 100).toFixed(1)}%)`);
      emotionOutput.innerText = `Top Emotions: ${top2.join(', ')}`;
    }
  }, 500);
});

generateBtn.addEventListener('click', async () => {
  if (!currentEmotions || Object.keys(currentEmotions).length === 0) {
    alert("No emotion detected.");
    return;
  }

  const top2 = Object.entries(currentEmotions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(e => e[0]);

  const emotionWords = top2.join(', ');
  const prompt = `meme: a (${emotionWords}) tired potato cartoon style`;

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  const data = await response.json();

  if (data.image) {
    memeImage.src = "data:image/png;base64," + data.image;
  } else {
    memeImage.alt = "Error: " + (data.error || "Unknown error");
    alert("Failed to generate meme.");
  }
});
