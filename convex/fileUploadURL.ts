import { mutation } from './_generated/server'

export default mutation({
  args: {},
  handler: async ({ storage }): Promise<string> => {
    return storage.generateUploadUrl();
  }
});
