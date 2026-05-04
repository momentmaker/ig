import { Storage } from '@google-cloud/storage'

export interface MinimalStorage {
  bucket: (name: string) => {
    file: (name: string) => {
      save: (data: Buffer, opts: object) => Promise<unknown>
    }
  }
}

const CACHE_CONTROL = 'public, max-age=31536000, immutable'

export async function uploadObject(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  storage: MinimalStorage = new Storage(),
): Promise<string> {
  if (!bucketName) throw new Error('bucket name required')
  if (!objectName) throw new Error('object name required')
  await storage.bucket(bucketName).file(objectName).save(buffer, {
    contentType: 'image/jpeg',
    metadata: {
      cacheControl: CACHE_CONTROL,
    },
    resumable: false,
  })
  return `https://storage.googleapis.com/${bucketName}/${objectName}`
}
