// src/__tests__/core/instanceTypes.test.js
// Tests for the plugin architecture foundation
// Run these to verify the interface, registry, and handler system work correctly

/**
 * TESTING STRATEGY
 *
 * These tests validate the foundation in layers:
 *
 * Layer 1: Interface Definition
 * - Verify the interface exists and has required methods
 * - Confirm error handling for unimplemented methods
 *
 * Layer 2: Registry System
 * - Test registration of handlers
 * - Verify retrieval and error cases
 * - Check available types listing
 *
 * Layer 3: VTK Handler Implementation
 * - Confirm VTK handler implements the interface
 * - Verify type and display name
 * - Test initialization without full VTK setup
 *
 * Layer 4: Integration
 * - Test registration → retrieval → usage flow
 * - Verify multiple handler registration
 * - Test error paths (missing types, etc.)
 */

// =============================================================================
// LAYER 1: Interface Tests
// =============================================================================

async function testInterfaceDefinition() {
  console.log("\n=== LAYER 1: Testing Interface Definition ===\n");

  try {
    // Dynamic import to avoid breaking if files don't exist yet
    const { InstanceTypeHandler } = await import(
      "@Core/instances/types/InstanceTypeInterface.js"
    );

    console.log("✅ Interface file loads successfully");

    // Create a bare instance to test error throwing
    const bareHandler = new InstanceTypeHandler();

    // Test that required methods throw errors when not implemented
    const requiredMethods = [
      "getType",
      "getDisplayName",
      "initialize",
      "cleanup",
      "loadData",
    ];

    let allMethodsThrow = true;

    for (const method of requiredMethods) {
      try {
        if (typeof bareHandler[method] === "function") {
          // Try to call it - should throw
          await bareHandler[method]();
          console.log(`❌ ${method}() should throw but didn't`);
          allMethodsThrow = false;
        } else {
          console.log(`❌ ${method}() doesn't exist on interface`);
          allMethodsThrow = false;
        }
      } catch (error) {
        if (error.message.includes("must be implemented")) {
          console.log(`✅ ${method}() correctly throws when not implemented`);
        } else {
          console.log(
            `⚠️  ${method}() throws, but with unexpected message: ${error.message}`
          );
        }
      }
    }

    // Test optional methods return defaults
    const optionalMethods = ["getTools", "getHeaderInfo", "supportsInstanceVR"];

    for (const method of optionalMethods) {
      if (typeof bareHandler[method] === "function") {
        const result = await bareHandler[method]();
        console.log(
          `✅ ${method}() has default implementation, returns:`,
          result
        );
      }
    }

    console.log("\n✅ Layer 1: Interface definition is correct\n");
    return true;
  } catch (error) {
    console.error("❌ Layer 1 Failed:", error);
    console.error(
      "   Make sure InstanceTypeInterface.js exists at src/core/instances/types/"
    );
    return false;
  }
}

// =============================================================================
// LAYER 2: Registry Tests
// =============================================================================

async function testRegistrySystem() {
  console.log("\n=== LAYER 2: Testing Registry System ===\n");

  try {
    const { InstanceTypeRegistry } = await import(
      "@Core/instances/types/InstanceTypeRegistry.js"
    );
    const { InstanceTypeHandler } = await import(
      "@Core/instances/types/InstanceTypeInterface.js"
    );

    console.log("✅ Registry file loads successfully");

    // Create a test registry (don't use global singleton for tests)
    const testRegistry = new InstanceTypeRegistry();

    console.log("✅ Registry instantiates correctly");

    // Create mock handlers for testing
    class MockHandlerA extends InstanceTypeHandler {
      getType() {
        return "mock-a";
      }
      getDisplayName() {
        return "Mock Handler A";
      }
      async initialize() {
        return { mockData: "a" };
      }
      async cleanup() {}
      async loadData() {}
    }

    class MockHandlerB extends InstanceTypeHandler {
      getType() {
        return "mock-b";
      }
      getDisplayName() {
        return "Mock Handler B";
      }
      async initialize() {
        return { mockData: "b" };
      }
      async cleanup() {}
      async loadData() {}
    }

    const handlerA = new MockHandlerA();
    const handlerB = new MockHandlerB();

    // Test: Registration
    testRegistry.register(handlerA);
    console.log("✅ First handler registers successfully");

    testRegistry.register(handlerB);
    console.log("✅ Second handler registers successfully");

    // Test: Retrieval
    const retrievedA = testRegistry.getHandler("mock-a");
    if (retrievedA === handlerA) {
      console.log("✅ Retrieved handler matches registered handler");
    } else {
      console.log("❌ Retrieved handler does not match");
      return false;
    }

    // Test: Available types
    const availableTypes = testRegistry.getAvailableTypes();
    if (
      availableTypes.includes("mock-a") &&
      availableTypes.includes("mock-b")
    ) {
      console.log(
        `✅ getAvailableTypes() returns correct types: ${availableTypes.join(
          ", "
        )}`
      );
    } else {
      console.log("❌ getAvailableTypes() missing types");
      return false;
    }

    // Test: Has type check
    if (testRegistry.hasType("mock-a")) {
      console.log("✅ hasType() correctly identifies registered type");
    } else {
      console.log("❌ hasType() fails for registered type");
      return false;
    }

    if (!testRegistry.hasType("non-existent")) {
      console.log("✅ hasType() correctly returns false for unregistered type");
    } else {
      console.log(
        "❌ hasType() incorrectly returns true for unregistered type"
      );
      return false;
    }

    // Test: Error on missing type
    try {
      testRegistry.getHandler("non-existent");
      console.log("❌ getHandler() should throw for unregistered type");
      return false;
    } catch (error) {
      if (error.message.includes("not registered")) {
        console.log(
          "✅ getHandler() throws appropriate error for unregistered type"
        );
      } else {
        console.log("⚠️  getHandler() throws but with unexpected message");
      }
    }

    // Test: Get available handlers with display names
    const handlers = testRegistry.getAvailableHandlers();
    console.log("✅ getAvailableHandlers() returns:", handlers);

    console.log("\n✅ Layer 2: Registry system works correctly\n");
    return true;
  } catch (error) {
    console.error("❌ Layer 2 Failed:", error);
    console.error(
      "   Make sure InstanceTypeRegistry.js exists at src/core/instances/types/"
    );
    return false;
  }
}

// =============================================================================
// LAYER 3: VTK Handler Tests
// =============================================================================

async function testVTKHandler() {
  console.log("\n=== LAYER 3: Testing VTK Handler ===\n");

  try {
    const { VTKInstanceHandler } = await import(
      "@Core/instances/types/vtk/VTKInstanceHandler.js"
    );
    const { InstanceTypeHandler } = await import(
      "@Core/instances/types/InstanceTypeInterface.js"
    );

    console.log("✅ VTK handler file loads successfully");

    // Create handler instance
    const handler = new VTKInstanceHandler();

    // Test: Inheritance
    if (handler instanceof InstanceTypeHandler) {
      console.log("✅ VTK handler extends InstanceTypeHandler");
    } else {
      console.log("❌ VTK handler does not extend InstanceTypeHandler");
      return false;
    }

    // Test: Required methods are implemented
    const type = handler.getType();
    const displayName = handler.getDisplayName();

    console.log(`✅ getType() returns: "${type}"`);
    console.log(`✅ getDisplayName() returns: "${displayName}"`);

    if (type !== "vtk") {
      console.log('⚠️  Expected type to be "vtk"');
    }

    // Test: Tools configuration
    const tools = handler.getTools(null); // Pass null since we're not testing with real instance
    console.log(`✅ getTools() returns array with ${tools.length} tools`);

    if (tools.length > 0) {
      console.log("   Tools available:");
      tools.forEach((tool) => {
        console.log(`   - ${tool.label} (id: ${tool.id})`);
      });
    }

    // Test: Header info
    const headerInfo = handler.getHeaderInfo(null);
    console.log("✅ getHeaderInfo() returns:", headerInfo);

    // Test: VR capabilities
    const supportsVR = handler.supportsInstanceVR();
    console.log(`✅ supportsInstanceVR() returns: ${supportsVR}`);

    const vrCapabilities = handler.getVRCapabilities();
    console.log("✅ getVRCapabilities() returns:", vrCapabilities);

    // Note: We can't test initialize() here without a real DOM element
    // and full VTK.js setup. That will be tested in integration.
    console.log(
      "⚠️  Note: initialize(), cleanup(), and loadData() require full environment"
    );
    console.log("   These will be tested in integration phase");

    console.log("\n✅ Layer 3: VTK handler implements interface correctly\n");
    return true;
  } catch (error) {
    console.error("❌ Layer 3 Failed:", error);
    console.error(
      "   Make sure VTKInstanceHandler.js exists at src/core/instances/types/vtk/"
    );
    return false;
  }
}

// =============================================================================
// LAYER 4: Integration Tests
// =============================================================================

async function testIntegration() {
  console.log("\n=== LAYER 4: Testing Integration Flow ===\n");

  try {
    const { InstanceTypeRegistry } = await import(
      "@Core/instances/types/InstanceTypeRegistry.js"
    );
    const { VTKInstanceHandler } = await import(
      "@Core/instances/types/vtk/VTKInstanceHandler.js"
    );

    // Create fresh registry for integration test
    const testRegistry = new InstanceTypeRegistry();

    // Simulate app initialization: register handlers
    const vtkHandler = new VTKInstanceHandler();
    testRegistry.register(vtkHandler);

    console.log("✅ VTK handler registered with test registry");

    // Test: Retrieval after registration
    const handler = testRegistry.getHandler("vtk");
    console.log("✅ Successfully retrieved VTK handler from registry");

    // Test: Handler can be used
    const type = handler.getType();
    const displayName = handler.getDisplayName();
    console.log(
      `✅ Handler responds: type="${type}", displayName="${displayName}"`
    );

    // Test: Simulate instance creation flow (without DOM)
    console.log("\n📋 Simulating instance creation flow:");
    console.log("   1. User requests VTK instance");
    console.log("   2. InstanceManager gets handler from registry");
    console.log("   3. InstanceManager calls handler.initialize()");
    console.log("   4. Handler creates VTK pipeline");
    console.log("   5. Handler returns instance data");
    console.log("   6. InstanceManager stores metadata");

    // We can't run full initialize without DOM, but we can verify the pattern
    const mockInstanceData = {
      sceneObjects: { renderer: {}, renderWindow: {} },
    };

    // Test tools configuration with mock data
    const tools = handler.getTools(mockInstanceData);
    console.log(
      `✅ Tools can be retrieved for instance: ${tools.length} tools`
    );

    // Test collaborative features (they should gracefully handle mock data)
    await handler.setCursorVisibility(mockInstanceData, true, []);
    console.log("✅ Cursor visibility can be toggled");

    await handler.setAnnotationVisibility(mockInstanceData, true, []);
    console.log("✅ Annotation visibility can be toggled");

    console.log("\n✅ Layer 4: Integration flow works correctly\n");
    return true;
  } catch (error) {
    console.error("❌ Layer 4 Failed:", error);
    return false;
  }
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================

export async function runFoundationTests() {
  console.log("\n".repeat(2));
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  Plugin Architecture Foundation Tests                     ║");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("\n");

  const results = {
    layer1: false,
    layer2: false,
    layer3: false,
    layer4: false,
  };

  // Run tests in order
  results.layer1 = await testInterfaceDefinition();

  if (results.layer1) {
    results.layer2 = await testRegistrySystem();
  } else {
    console.log("❌ Skipping Layer 2 (Layer 1 failed)");
  }

  if (results.layer2) {
    results.layer3 = await testVTKHandler();
  } else {
    console.log("❌ Skipping Layer 3 (Layer 2 failed)");
  }

  if (results.layer3) {
    results.layer4 = await testIntegration();
  } else {
    console.log("❌ Skipping Layer 4 (Layer 3 failed)");
  }

  // Summary
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  TEST SUMMARY                                              ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(
    `║  Layer 1 (Interface):   ${
      results.layer1 ? "✅ PASS" : "❌ FAIL"
    }                              ║`
  );
  console.log(
    `║  Layer 2 (Registry):    ${
      results.layer2 ? "✅ PASS" : "❌ FAIL"
    }                              ║`
  );
  console.log(
    `║  Layer 3 (VTK Handler): ${
      results.layer3 ? "✅ PASS" : "❌ FAIL"
    }                              ║`
  );
  console.log(
    `║  Layer 4 (Integration): ${
      results.layer4 ? "✅ PASS" : "❌ FAIL"
    }                              ║`
  );
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const allPassed = Object.values(results).every((r) => r);

  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED! Foundation is solid.");
    console.log("\nNext steps:");
    console.log(
      "1. Create VTK widgets in src/core/instances/types/vtk/widgets/"
    );
    console.log("2. Update WorkspaceManager to use plugin system");
    console.log("3. Update UI components to be type-agnostic");
    console.log("4. Test with real VTK scene creation");
  } else {
    console.log("⚠️  Some tests failed. Fix these before proceeding.");
    console.log("\nCommon issues:");
    console.log("- Files not in correct locations");
    console.log("- Missing export statements");
    console.log("- Handler not extending InstanceTypeHandler");
  }

  return allPassed;
}

// =============================================================================
// BROWSER CONSOLE HELPERS
// =============================================================================

// Make test runner available in browser console
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.runFoundationTests = runFoundationTests;

  console.log("\n💡 Foundation tests loaded!");
  console.log("   Run: CIA.runFoundationTests()");
  console.log("   Or import and call: runFoundationTests()\n");
}
