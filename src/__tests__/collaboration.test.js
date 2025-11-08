// src/__tests__/collaboration.test.js
describe("Collaboration", () => {
  it("should sync dataset across multiple clients", async () => {
    const client1 = await createTestClient();
    const client2 = await createTestClient();

    await client1.loadDataset(testFile);
    await waitForSync();

    const datasets1 = client1.getDatasets();
    const datasets2 = client2.getDatasets();

    expect(datasets1).toEqual(datasets2);
  });
});
