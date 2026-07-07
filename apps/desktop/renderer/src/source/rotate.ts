/**
 * Display-time rotation (owner correction for sideways phone photos).
 * The rotation lives in the dossier; the pixels are redrawn on a canvas
 * HERE, for display only — the original file is evidence and is never
 * rewritten. DOM APIs are reached at call time only (headless imports).
 */
export function applyRotation(
  dataUrl: string,
  rotation: number,
  mimeType = 'image/jpeg'
): Promise<string> {
  if (!rotation || rotation % 360 === 0) return Promise.resolve(dataUrl)
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const quarterTurn = rotation === 90 || rotation === 270
      const canvas = document.createElement('canvas')
      canvas.width = quarterTurn ? image.naturalHeight : image.naturalWidth
      canvas.height = quarterTurn ? image.naturalWidth : image.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) return resolve(dataUrl)
      context.translate(canvas.width / 2, canvas.height / 2)
      context.rotate((rotation * Math.PI) / 180)
      context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
      // JPEG sources re-encode as JPEG (photos; a PNG data URL of a
      // camera image would be enormous), everything else as PNG.
      resolve(
        mimeType === 'image/jpeg'
          ? canvas.toDataURL('image/jpeg', 0.92)
          : canvas.toDataURL('image/png')
      )
    }
    image.onerror = () => resolve(dataUrl)
    image.src = dataUrl
  })
}
