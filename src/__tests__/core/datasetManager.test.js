// src/__tests__/datasetManager.test.js
describe("DatasetManager", () => {
  it("should generate consistent hashes for same file", async () => {
    const file1 = new File(["test"], "test.vtp");
    const file2 = new File(["test"], "test.vtp");

    const hash1 = await dataCache.hashFile(file1);
    const hash2 = await dataCache.hashFile(file2);

    expect(hash1).toBe(hash2);
  });
});
