import { mutation } from './_generated/server'

export default mutation(
  async ({ storage }): Promise<string> => {
    return storage.generateUploadUrl();
  }
)
