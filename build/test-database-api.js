// Test script to verify database API functionality
const testDatabaseAPI = async () => {
  console.log("🧪 Testing Database API Integration");
  
  // Test with a known agent ID
  const testAgentId = "3e245640-8d88-44b9-9b00-d96a337fe9f3"; // FPH MYSQL agent
  
  try {
    console.log(`📡 Calling API: http://localhost:5000/api/databases/${testAgentId}`);
    
    const response = await fetch(`http://localhost:5000/api/databases/${testAgentId}`);
    const data = await response.json();
    
    console.log("📊 API Response:", JSON.stringify(data, null, 2));
    
    if (data.success && Array.isArray(data.databases)) {
      console.log("✅ SUCCESS: API returned database list");
      console.log(`📋 Found ${data.databases.length} databases:`);
      data.databases.forEach((db, index) => {
        console.log(`   ${index + 1}. ${db}`);
      });
    } else {
      console.log("❌ FAILURE: API did not return expected data");
    }
  } catch (error) {
    console.error("❌ ERROR: Failed to call API", error);
  }
};

// Export for use in browser console
window.testDatabaseAPI = testDatabaseAPI;

console.log("🎯 Database API test loaded. Run testDatabaseAPI() in console to test.");