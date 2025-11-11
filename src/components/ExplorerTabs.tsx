import React, { useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Constants } from './config';

type Tab = {
  id: string;
  title: string;
  type: "dashboard" | "explorer";
};

const genId = (base: string, n: number) => `${base}-${n}`;

// Sample data for the chart (like in your screenshot)
const sampleData = [
  { month: 'Jan', Expenses: 3000, Profit: 2000, Revenue: 5000 },
  { month: 'Feb', Expenses: 3500, Profit: 2500, Revenue: 6000 },
  { month: 'Mar', Expenses: 4000, Profit: 3500, Revenue: 7500 },
  { month: 'Apr', Expenses: 4200, Profit: 4500, Revenue: 9000 },
  { month: 'May', Expenses: 4800, Profit: 4700, Revenue: 9500 },
  { month: 'Jun', Expenses: 5000, Profit: 5000, Revenue: 10000 }
];

const ChartSection: React.FC<{ data: any, chartType: string, setChartType: (type: string) => void }> = ({ data, chartType, setChartType }) => {
  const [activeView, setActiveView] = useState<"chart" | "table">("chart");
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>("");
  const [newDashboardName, setNewDashboardName] = useState("");

  // Convert SQL query results to chart data format
  // Load dashboards when modal opens
  React.useEffect(() => {
    if (showDashboardModal) {
      loadDashboards();
    }
  }, [showDashboardModal]);

  const loadDashboards = async () => {
    try {
      console.log("🔍 Loading dashboards from database...");
      const response = await axios.get(`${Constants.API_BASE_URL}/api/dashboards`);
      console.log("📊 Dashboard API response:", response.data);
      
      if (response.data?.success && Array.isArray(response.data.dashboards)) {
        const dashboardList = response.data.dashboards;
        console.log("✅ Setting dashboards from database:", dashboardList);
        setDashboards(dashboardList);
      } else {
        console.log("⚠️ No dashboards found or API error, using fallback data");
        // Fallback to mock data if API fails
        const fallbackDashboards = [
          { id: "1", name: "Sales Dashboard", created_at: "2024-01-15" },
          { id: "2", name: "Marketing Analytics", created_at: "2024-01-20" },
          { id: "3", name: "Financial Overview", created_at: "2024-02-01" },
          { id: "4", name: "Customer Insights", created_at: "2024-02-10" }
        ];
        setDashboards(fallbackDashboards);
      }
    } catch (error) {
      console.error("❌ Error loading dashboards from database:", error);
      // Fallback to mock data if API call fails
      const fallbackDashboards = [
        { id: "1", name: "Sales Dashboard", created_at: "2024-01-15" },
        { id: "2", name: "Marketing Analytics", created_at: "2024-01-20" },
        { id: "3", name: "Financial Overview", created_at: "2024-02-01" },
        { id: "4", name: "Customer Insights", created_at: "2024-02-10" }
      ];
      console.log("⚠️ Using fallback dashboards:", fallbackDashboards);
      setDashboards(fallbackDashboards);
    }
  };

  const handleAddToDashboard = async () => {
    if (!selectedDashboard && !newDashboardName.trim()) {
      alert("Please select a dashboard or enter a new dashboard name");
      return;
    }

    try {
      let dashboardId = selectedDashboard;
      let dashboardName = selectedDashboard ? 
        dashboards.find(d => d.id === selectedDashboard)?.name : 
        newDashboardName.trim();

      // If creating a new dashboard, call the API to create it first
      if (!selectedDashboard && newDashboardName.trim()) {
        console.log("🆕 Creating new dashboard:", newDashboardName.trim());

        const createResponse = await axios.post(`${Constants.API_BASE_URL}/api/dashboards`, {
          name: newDashboardName.trim(),
          description: `Dashboard for ${newDashboardName.trim().toLowerCase()} analytics`,
          user_id: "demo-user-123" // You might want to get this from context
        });

        if (createResponse.data?.success && createResponse.data.dashboard) {
          dashboardId = createResponse.data.dashboard.id;
          console.log("✅ New dashboard created with ID:", dashboardId);
        } else {
          throw new Error("Failed to create new dashboard");
        }
      }

      // Now add the chart to the dashboard
      console.log("📊 Adding chart to dashboard:", {
        dashboardId,
        dashboardName,
        chartType,
        chartData: data,
        timestamp: new Date().toISOString()
      });

      const addChartResponse = await axios.post(`${Constants.API_BASE_URL}/api/dashboards/${dashboardId}/charts`, {
        chart_type: chartType,
        chart_data: data,
        chart_config: {
          columns: data?.columns || ['month', 'Expenses', 'Profit', 'Revenue'],
          chartType: chartType
        }
      });

      if (addChartResponse.data?.success) {
        alert(`✅ Chart added to "${dashboardName}" dashboard successfully!`);
        // Refresh the dashboard list to include any new dashboard
        await loadDashboards();
      } else {
        throw new Error(addChartResponse.data?.error || "Failed to add chart to dashboard");
      }

      setShowDashboardModal(false);
      setSelectedDashboard("");
      setNewDashboardName("");
    } catch (error: any) {
      console.error("❌ Error adding to dashboard:", error);
      alert(`Failed to add chart to dashboard: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleExportToCSV = () => {
    try {
      const chartData = convertToChartData(data);
      const columns = data?.columns || ['month', 'Expenses', 'Profit', 'Revenue'];

      if (!chartData || chartData.length === 0) {
        alert("No data available to export");
        return;
      }

      // Create CSV content
      const csvContent = [
        // Header row
        columns.join(','),
        // Data rows
        ...chartData.map((row: any) => 
          columns.map((col: string) => {
            const value = row[col];
            // Handle values that contain commas by wrapping in quotes
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `chart_data_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert("✅ Data exported to CSV successfully!");
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      alert("Failed to export data to CSV");
    }
  };

  const convertToChartData = (queryData: any) => {
    if (!queryData || !queryData.columns || !queryData.rows) {
      return sampleData; // Fallback to sample data
    }

    // Convert rows array to chart format
    return queryData.rows.map((row: any) => {
      const chartRow: any = {};
      queryData.columns.forEach((col: string, index: number) => {
        chartRow[col] = row[col] || row[index]; // Handle both object and array formats
      });
      return chartRow;
    });
  };

  const chartData = convertToChartData(data);
  const columns = data?.columns || ['month', 'Expenses', 'Profit', 'Revenue'];

  return (
    <div>
      {/* Chart/Table Tabs */}
      <div style={{ 
        padding: "16px 20px 0", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        borderBottom: "1px solid #f0f0f0"
      }}>
        <div style={{ display: "flex", gap: "8px" }}>
            <button
            onClick={() => setActiveView("table")}
            style={{
              padding: "8px 16px",
              background: activeView === "table" ? "#52c41a" : "transparent",
              color: activeView === "table" ? "white" : "#666",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            Table
          </button>
          <button
            onClick={() => setActiveView("chart")}
            style={{
              padding: "8px 16px",
              background: activeView === "chart" ? "#52c41a" : "transparent",
              color: activeView === "chart" ? "white" : "#666",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            Chart
          </button>
          
        </div>

        {/* Chart Type Dropdown and Action Buttons */}
        {activeView === "chart" && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              style={{
                padding: "6px 12px",
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                fontSize: "13px",
                background: "white"
              }}
            >
              <option value="Bar Chart">Bar Chart</option>
              <option value="Line Chart">Line Chart</option>
              <option value="Pie Chart">Pie Chart</option>
            </select>
            <button
              onClick={() => setShowDashboardModal(true)}
              style={{
                padding: "6px 14px",
                background: "#1890ff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              📊 Add to Dashboard
            </button>
            <button
              onClick={handleExportToCSV}
              style={{
                padding: "6px 14px",
                background: "#52c41a",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              📥 Export to CSV
            </button>
          </div>
        )}
      </div>

      {/* Chart/Table Content */}
      <div style={{ padding: "20px" }}>
        {activeView === "chart" ? (
          <div style={{ height: "450px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "Bar Chart" && (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={columns[0]} 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      background: "white", 
                      border: "1px solid #e8e8e8",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                    }}
                  />
                  <Legend />
                  {columns.slice(1).map((col: string, index: number) => {
                    const colors = ["#52c41a", "#faad14", "#1890ff", "#722ed1", "#eb2f96"];
                    return (
                      <Bar key={col} dataKey={col} fill={colors[index % colors.length]} />
                    );
                  })}
                </BarChart>
              )}
              
              {chartType === "Line Chart" && (
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={columns[0]} 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      background: "white", 
                      border: "1px solid #e8e8e8",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                    }}
                  />
                  <Legend />
                  {columns.slice(1).map((col: string, index: number) => {
                    const colors = ["#52c41a", "#faad14", "#1890ff", "#722ed1", "#eb2f96"];
                    return (
                      <Line 
                        key={col} 
                        type="monotone" 
                        dataKey={col} 
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    );
                  })}
                </LineChart>
              )}
              
              {chartType === "Pie Chart" && (
                <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <Tooltip 
                    contentStyle={{ 
                      background: "white", 
                      border: "1px solid #e8e8e8",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                    }}
                  />
                  <Legend />
                  {columns.slice(1).map((col: string, index: number) => {
                    const colors = ["#52c41a", "#faad14", "#1890ff", "#722ed1", "#eb2f96"];
                    // For pie chart, we need to transform data differently
                    const pieData = chartData.map((item: any) => ({
                      name: item[columns[0]],
                      value: item[col]
                    }));
                    
                    return (
                      <Pie
                        key={col}
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100 + index * 20}
                        innerRadius={index === 0 ? 0 : 60 + index * 20}
                        fill={colors[index % colors.length]}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      />
                    );
                  })}
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {columns.map((col: string) => (
                    <th key={col} style={{ padding: "12px", textAlign: "left", border: "1px solid #e8e8e8" }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((row: any, i: number) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}>
                    {columns.map((col: string) => (
                      <td key={col} style={{ padding: "10px 12px", border: "1px solid #e8e8e8" }}>
                        {typeof row[col] === 'number' ? row[col].toLocaleString() : String(row[col] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add to Dashboard Modal */}
      {showDashboardModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            width: "480px",
            maxWidth: "90vw",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px"
            }}>
              <h3 style={{ margin: 0, color: "#333", fontSize: "18px" }}>
                📊 Add Chart to Dashboard
              </h3>
              <button
                onClick={() => {
                  setShowDashboardModal(false);
                  setSelectedDashboard("");
                  setNewDashboardName("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#999"
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333"
              }}>
                Select Existing Dashboard:
              </label>
              <select
                value={selectedDashboard}
                onChange={(e) => {
                  setSelectedDashboard(e.target.value);
                  if (e.target.value) setNewDashboardName("");
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "2px solid #e8e8e8",
                  borderRadius: "6px",
                  fontSize: "14px",
                  background: "white",
                  cursor: "pointer"
                }}
              >
                <option value="">Choose a dashboard...</option>
                {dashboards.map((dashboard) => (
                  <option key={dashboard.id} value={dashboard.id}>
                    {dashboard.name} (Created: {new Date(dashboard.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px"
            }}>
              <hr style={{ flex: 1, border: "none", borderTop: "1px solid #e8e8e8" }} />
              <span style={{ color: "#999", fontSize: "14px", fontWeight: "600" }}>OR</span>
              <hr style={{ flex: 1, border: "none", borderTop: "1px solid #e8e8e8" }} />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333"
              }}>
                Create New Dashboard:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px", color: "#52c41a" }}>+</span>
                <input
                  type="text"
                  value={newDashboardName}
                  onChange={(e) => {
                    setNewDashboardName(e.target.value);
                    if (e.target.value.trim()) setSelectedDashboard("");
                  }}
                  placeholder="Enter new dashboard name..."
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "2px solid #e8e8e8",
                    borderRadius: "6px",
                    fontSize: "14px"
                  }}
                />
              </div>
            </div>

            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px"
            }}>
              <button
                onClick={() => {
                  setShowDashboardModal(false);
                  setSelectedDashboard("");
                  setNewDashboardName("");
                }}
                style={{
                  padding: "10px 20px",
                  background: "#f5f5f5",
                  color: "#333",
                  border: "1px solid #d9d9d9",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddToDashboard}
                disabled={!selectedDashboard && !newDashboardName.trim()}
                style={{
                  padding: "10px 20px",
                  background: (!selectedDashboard && !newDashboardName.trim()) ? "#d9d9d9" : "#1890ff",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: (!selectedDashboard && !newDashboardName.trim()) ? "not-allowed" : "pointer",
                  fontWeight: "600"
                }}
              >
                Add to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [selectedDashboard, setSelectedDashboard] = useState<string>("");
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load dashboards when component mounts
  React.useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    setLoading(true);
    try {
      console.log("🔍 Loading dashboards from database...");
      const response = await axios.get(`${Constants.API_BASE_URL}/api/dashboards`);
      console.log("📊 Dashboard API response:", response.data);
      
      if (response.data?.success && Array.isArray(response.data.dashboards)) {
        const dashboardList = response.data.dashboards.map((dashboard: any) => ({
          ...dashboard,
          // Ensure description field exists
          description: dashboard.description || `Dashboard for ${dashboard.name.toLowerCase()} analytics`
        }));
        
        console.log("✅ Setting dashboards from database:", dashboardList);
        setDashboards(dashboardList);
        
        // Auto-select first dashboard if available
        if (dashboardList.length > 0 && !selectedDashboard) {
          setSelectedDashboard(dashboardList[0].id);
          console.log("🎯 Auto-selected dashboard:", dashboardList[0].name);
        }
      } else {
        console.log("⚠️ No dashboards found or API error, using fallback data");
        // Fallback to mock data if API fails
        const fallbackDashboards = [
          { id: "1", name: "Sales Dashboard", created_at: "2024-01-15", description: "Sales performance and metrics" },
          { id: "2", name: "Marketing Analytics", created_at: "2024-01-20", description: "Campaign performance and ROI" },
          { id: "3", name: "Financial Overview", created_at: "2024-02-01", description: "Revenue and expense tracking" },
          { id: "4", name: "Customer Insights", created_at: "2024-02-10", description: "Customer behavior and analytics" },
          { id: "5", name: "Operations Dashboard", created_at: "2024-02-15", description: "Operational KPIs and metrics" }
        ];
        
        setDashboards(fallbackDashboards);
        if (fallbackDashboards.length > 0 && !selectedDashboard) {
          setSelectedDashboard(fallbackDashboards[0].id);
        }
      }
    } catch (error) {
      console.error("❌ Error loading dashboards from database:", error);
      // Fallback to mock data if API call fails
      const fallbackDashboards = [
        { id: "1", name: "Sales Dashboard", created_at: "2024-01-15", description: "Sales performance and metrics" },
        { id: "2", name: "Marketing Analytics", created_at: "2024-01-20", description: "Campaign performance and ROI" },
        { id: "3", name: "Financial Overview", created_at: "2024-02-01", description: "Revenue and expense tracking" },
        { id: "4", name: "Customer Insights", created_at: "2024-02-10", description: "Customer behavior and analytics" },
        { id: "5", name: "Operations Dashboard", created_at: "2024-02-15", description: "Operational KPIs and metrics" }
      ];
      
      console.log("⚠️ Using fallback dashboards:", fallbackDashboards);
      setDashboards(fallbackDashboards);
      if (fallbackDashboards.length > 0 && !selectedDashboard) {
        setSelectedDashboard(fallbackDashboards[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDashboardChange = (dashboardId: string) => {
    setSelectedDashboard(dashboardId);
    // Here you would load the specific dashboard content
    console.log("Loading dashboard:", dashboardId);
  };

  const selectedDashboardData = dashboards.find(d => d.id === selectedDashboard);

  return (
    <div style={{ padding: 20 }}>
      {/* Dashboard Header with Dropdown */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "1px solid #e8e8e8"
      }}>
        <h3 style={{ margin: 0, color: "#333", fontSize: "24px" }}>Dashboard</h3>
        
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ 
            fontSize: "14px", 
            fontWeight: "600", 
            color: "#666" 
          }}>
            Select Dashboard:
          </label>
          <select
            value={selectedDashboard}
            onChange={(e) => handleDashboardChange(e.target.value)}
            disabled={loading}
            style={{
              padding: "8px 12px",
              border: "2px solid #e8e8e8",
              borderRadius: "6px",
              fontSize: "14px",
              background: "white",
              cursor: loading ? "not-allowed" : "pointer",
              minWidth: "200px"
            }}
          >
            <option value="" disabled>
              {loading ? "Loading dashboards..." : "Choose a dashboard..."}
            </option>
            {dashboards.map((dashboard) => (
              <option key={dashboard.id} value={dashboard.id}>
                {dashboard.name}
              </option>
            ))}
          </select>
          <button
            onClick={loadDashboards}
            disabled={loading}
            title="Refresh dashboards"
            style={{
              padding: "8px 12px",
              background: "#1890ff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "600"
            }}
          >
            {loading ? "⏳" : "🔄"}
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      {selectedDashboardData ? (
        <div>
          {/* Dashboard Info */}
          <div style={{
            background: "#f6f8fa",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #e1e4e8"
          }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#1890ff" }}>
              {selectedDashboardData.name}
            </h4>
            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "14px" }}>
              {selectedDashboardData.description}
            </p>
            <p style={{ margin: 0, color: "#999", fontSize: "12px" }}>
              Created: {new Date(selectedDashboardData.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Dashboard Cards/Widgets */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={{ 
              padding: 20, 
              background: "white", 
              border: "1px solid #e8e8e8", 
              borderRadius: 8,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <h5 style={{ margin: "0 0 12px 0", color: "#333" }}>📊 Chart Widget 1</h5>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                Sample chart or visualization would be displayed here
              </p>
            </div>
            
            <div style={{ 
              padding: 20, 
              background: "white", 
              border: "1px solid #e8e8e8", 
              borderRadius: 8,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <h5 style={{ margin: "0 0 12px 0", color: "#333" }}>📈 Metrics Widget</h5>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                Key performance indicators and metrics
              </p>
            </div>
            
            <div style={{ 
              padding: 20, 
              background: "white", 
              border: "1px solid #e8e8e8", 
              borderRadius: 8,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <h5 style={{ margin: "0 0 12px 0", color: "#333" }}>📋 Data Table</h5>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                Tabular data and summaries
              </p>
            </div>
            
            <div style={{ 
              padding: 20, 
              background: "white", 
              border: "1px solid #e8e8e8", 
              borderRadius: 8,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <h5 style={{ margin: "0 0 12px 0", color: "#333" }}>🎯 Goals & Targets</h5>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                Progress tracking and goal monitoring
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          color: "#999"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
          <h4 style={{ margin: "0 0 8px 0", color: "#666" }}>No Dashboard Selected</h4>
          <p style={{ margin: 0 }}>Please select a dashboard from the dropdown above</p>
        </div>
      )}
    </div>
  );
};

const DataExplorer: React.FC<{ tabTitle?: string }> = ({ tabTitle }) => {
  const USER_ID = "demo-user-123";
  const [question, setQuestion] = useState("");
  const [isQuestionEditable, setIsQuestionEditable] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [favFilter, setFavFilter] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isEditingSQL, setIsEditingSQL] = useState(false);
  const [editedSQL, setEditedSQL] = useState('');
  const [showChart, setShowChart] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [chartType, setChartType] = useState("Bar Chart");
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");

  // Add this new useEffect to load favorites when an agent is selected
  React.useEffect(() => {
    if (selectedAgent?.id) {
      loadFavorites(selectedAgent.id);
    }
  }, [selectedAgent]);

  // Add this new useEffect to load favorites when an agent is selected
  React.useEffect(() => {
    if (selectedAgent?.id) {
      loadFavorites(selectedAgent.id);
    }
  }, [selectedAgent]);

  // Helper function to extract database names from stored procedure results
  const extractDatabasesFromSPResults = (spData: any[]): string[] => {
    const databases: string[] = [];
    const seenNames = new Set<string>();

    spData.forEach((config: any) => {
      // Try different possible field names for database
      const possibleDbFields = [
        'database_name', 'db_name', 'name', 'database', 
        'schema_name', 'table_schema', 'catalog_name',
        'config_database', 'target_database'
      ];

      let dbName = null;

      // Find database name
      for (const field of possibleDbFields) {
        if (config[field] && typeof config[field] === 'string') {
          dbName = config[field];
          break;
        }
      }

      // Add to list if we found a database name and it's not a duplicate
      if (dbName && !seenNames.has(dbName)) {
        seenNames.add(dbName);
        databases.push(dbName);
      }
    });

    return databases;
  };

  // Load agents when component mounts
  React.useEffect(() => {
    loadAgentsList();
  }, []);

  // Add this new useEffect to load favorites when an agent is selected
  React.useEffect(() => {
    if (selectedAgent?.id) {
      loadFavorites(selectedAgent.id);
    }
  }, [selectedAgent]);

  // Update editedSQL when response changes
  React.useEffect(() => {
    if (response?.sql) {
      setEditedSQL(response.sql);
    }
  }, [response?.sql]);

  // Update data when response changes
  React.useEffect(() => {
    if (response?.data?.rows) {
      setData(response.data.rows);
    }
  }, [response?.data]);


  const loadAgentsList = async () => {
    try {
      const res = await fetch(`${Constants.API_BASE_URL}/api/agents/${USER_ID}`);
      const data = await res.json();

      // Ensure we always set an array to avoid "agents.map is not a function"
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.rows)
          ? (data as any).rows
          : [];

      if (!Array.isArray(list)) {
        console.warn("Unexpected /api/agents response:", data);
      }

      setAgents(list);
      // Set the first agent as selected if none is selected
      if (list.length > 0 && !selectedAgent) {
        setSelectedAgent(list[0]);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      setAgents([]);
    }
  };

  const loadFavorites = async (agentId: string): Promise<void> => {
    try {
      const response = await axios.get(`${Constants.API_BASE_URL}/api/favorites/${agentId}`);
      if (response.data?.success) {
        setFavorites(response.data.favorites);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handleFavoriteClick = async (favorite: any) => {

    try {
      // Get the favorite details
      const res = await fetch(`${Constants.API_BASE_URL}/api/favorites/detail/${favorite.id}`);
      const data = await res.json();
      
      if (data.success && data.favorite) {
        // Set the question to the original query
        setQuestion(data.favorite.query || data.favorite.name);
        
        // If there's SQL, set it as a response
        if (data.favorite.sql) {
          setResponse({
            sql: data.favorite.sql,
            answer: "Loaded from favorites",
            data: { columns: [], rows: [] } // This will be populated when you execute
          });
          setEditedSQL(data.favorite.sql);
        }
      }
    } catch (error) {
      console.error("❌ Error loading favorite details:", error);
      alert("Failed to load favorite details");
    }
  };

  const handleSelectAgent = async (agent: any) => {
    try {
      const parsed = parseDbUrl(agent.db_url);
      if (!parsed) {
        alert("Could not parse database URL");
        return;
      }

      const testRes = await fetch(`${Constants.API_BASE_URL}/api/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db_type: parsed.dbType,
          host: parsed.host,
          db_name: parsed.dbName,
          user: parsed.user,
          password: parsed.password,
          port: parseInt(parsed.port || "5432", 10),
        }),
      });

      const testData = await testRes.json();
      if (testData.success) {
        setSelectedAgent(agent);
        
        // Call stored procedure sp_get_db_config_by_id when agent is selected
        // and use the results to update the database list
        try {
          console.log("🔍 Calling sp_get_db_config_by_id for agent:", agent.id);
          const spResponse = await axios.get(`${Constants.API_BASE_URL}/api/agent/${agent.id}/db-config`);
          console.log("📊 DB Config SP response:", spResponse.data);
          
          if (spResponse.data?.success && spResponse.data.data && spResponse.data.data.length > 0) {
            console.log(`✅ SP returned ${spResponse.data.count} configuration rows`);
            console.log("📋 SP Result Structure Sample:", JSON.stringify(spResponse.data.data[0], null, 2));
            
            // Extract database names from stored procedure results using helper function
            const databaseList = extractDatabasesFromSPResults(spResponse.data.data);
            
            if (databaseList.length > 0) {
              console.log("🎯 Setting databases from SP results:", databaseList);
              setDatabases(databaseList);
              setSelectedDatabase(databaseList[0]);
              console.log("🎯 Auto-selected database from SP:", databaseList[0]);
            } else {
              console.log("⚠️ No database names found in SP results, falling back to API");
              console.log("📋 Available fields in SP results:", Object.keys(spResponse.data.data[0] || {}));
              await loadDatabasesList(agent.id);
            }
          } else {
            console.log("⚠️ SP call failed or returned no data, falling back to API");
            await loadDatabasesList(agent.id);
          }
        } catch (error: any) {
          console.error("❌ Error calling sp_get_db_config_by_id:", error);
          console.log("⚠️ Falling back to standard database loading");
          await loadDatabasesList(agent.id);
        }
      } else {
        alert("❌ Connection failed: " + testData.error);
      }
    } catch (error) {
      alert("❌ Error connecting to agent");
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || !selectedAgent) return;
    
    setLoading(true);
    
    try {
      const res = await fetch(`${Constants.API_BASE_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          agent_id: selectedAgent.id,
          execute: true,
          user_id: USER_ID,
          limit: 50,
          session_id: sessionId,
        })
      });
      
      const data = await res.json();
      
      const result = {
        answer: data.answer,
        sql: data.sql,
        data: data.data || { columns: [], rows: [] },
        session_id: data.session_id
      };
      
      setResponse(result);
      if (result.session_id) setSessionId(result.session_id);
    } catch (err) {
      console.error("Error:", err);
      setResponse({
        answer: "⚠️ Error contacting AI agent",
        sql: "",
        data: { columns: [], rows: [] }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFavorite = async () => {
    if (!response?.sql || !question.trim()) {
      alert("Please generate a query first before adding to favorites");
      return;
    }

    if (!selectedAgent?.id) {
      alert("Please select an agent first before adding to favorites");
      return;
    }

    try {
      console.log("🌟 Adding to favorites:", {
        user_id: USER_ID,
        name: question.substring(0, 50) + (question.length > 50 ? "..." : ""),
        query: question,
        sql: response.sql,
        agent_id: selectedAgent.id
      });

      const res = await fetch(`${Constants.API_BASE_URL}/api/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          name: question.substring(0, 50) + (question.length > 50 ? "..." : ""),
          query: question,
          sql: response.sql,
          agent_id: selectedAgent.id
        })
      });

      const responseData = await res.json();
      console.log("🌟 Favorites API response:", responseData);

      if (res.ok && responseData.success !== false) {
        alert("✅ Added to favorites successfully!");
        // Add this line to refresh favorites after adding a new one
        if (selectedAgent?.id) {
          loadFavorites(selectedAgent.id);
        }
      } else {
        console.error("❌ Favorites API error:", responseData);
        throw new Error(responseData.error || responseData.message || "Failed to add favorite");
      }
    } catch (err: any) {
      console.error("❌ Error adding favorite:", err);
      alert(`Failed to add to favorites: ${err.message || err.toString()}`);
    }
  };

  const applyEditedSQL = async () => {
    if (!editedSQL.trim()) return;
    
    setLoading(true);
    
    try {
      const res = await fetch(`${Constants.API_BASE_URL}/api/execute-sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: editedSQL,
          user_id: USER_ID,
          limit: 50
        })
      });
      
      const data = await res.json();
      
      setResponse({
        ...response,
        sql: editedSQL,
        data: data.data || { columns: [], rows: [] }
      });
      
      setIsEditingSQL(false);
    } catch (err) {
      console.error("Error executing SQL:", err);
      alert("Error executing SQL query");
    } finally {
      setLoading(false);
    }
  };

  const loadDatabasesList = async (agentId: string) => {
    console.log("🔍 Loading databases for agent:", agentId);
    
    try {
      // Call the real API endpoint
      const response = await axios.get(`${Constants.API_BASE_URL}/api/databases/${agentId}`);
      console.log("📊 Database API response:", response.data);
      
      if (response.data?.success && Array.isArray(response.data.databases)) {
        const databaseList = response.data.databases;
        console.log("✅ Setting databases:", databaseList);
        setDatabases(databaseList);
        
        // Auto-select first database if available
        if (databaseList.length > 0 && !selectedDatabase) {
          setSelectedDatabase(databaseList[0]);
          console.log("🎯 Auto-selected database:", databaseList[0]);
        }
      } else {
        console.log("⚠️ No databases found or API error:", response.data);
        // Fallback to mock data if API fails
        const fallbackDatabases = [
          "SampleDB1", 
          "SampleDB2", 
          "UserDatabase", 
          "ProductionDB",
          "TestDatabase"
        ];
        
        setDatabases(fallbackDatabases);
        if (fallbackDatabases.length > 0 && !selectedDatabase) {
          setSelectedDatabase(fallbackDatabases[0]);
          console.log("🎯 Auto-selected fallback database:", fallbackDatabases[0]);
        }
      }
    } catch (error: any) {
      console.error("❌ Error loading databases:", error);
      
      // Fallback to mock data if API call fails
      const fallbackDatabases = [
        "SampleDB1", 
        "SampleDB2", 
        "UserDatabase", 
        "ProductionDB",
        "TestDatabase"
      ];
      
      console.log("⚠️ Using fallback databases:", fallbackDatabases);
      setDatabases(fallbackDatabases);
      if (fallbackDatabases.length > 0 && !selectedDatabase) {
        setSelectedDatabase(fallbackDatabases[0]);
        console.log("🎯 Auto-selected fallback database:", fallbackDatabases[0]);
      }
    }
  };

  function parseDbUrl(dbUrl: string) {
    try {
      const normalized = dbUrl.replace(/^postgres:\/\//, "postgresql://");
      const u = new URL(normalized);
      return {
        dbType: u.protocol.replace(":", ""),
        user: decodeURIComponent(u.username || ""),
        password: decodeURIComponent(u.password || ""),
        host: u.hostname || "",
        port: u.port || "",
        dbName: u.pathname?.replace(/^\//, "") || ""
      };
    } catch (e) {
      return null;
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f5f5f5" }}>
      {/* Sidebar */}
      <div style={{
        width: "320px",
        background: "white",
        borderRight: "1px solid #e8e8e8",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto"
      }}>
        <div style={{ padding: "20px", borderBottom: "1px solid #e8e8e8" }}>
          {/* Agent Selection Dropdown */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: "600", color: "#666", textTransform: "uppercase" }}>
              Switch Agent:
            </label>
            <select
              value={selectedAgent?.id || ""}
              onChange={async (e) => {
                if (e.target.value) {
                  const agent = agents.find(a => a.id === e.target.value);
                  if (agent) {
                    await handleSelectAgent(agent);
                  }
                }
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "2px solid #e8e8e8",
                borderRadius: "6px",
                fontSize: "13px",
                background: "white",
                cursor: "pointer",
                marginBottom: "8px"
              }}
            >
              <option value="" disabled>Select an agent...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.trained_at ? "✅" : "⚠️"}
                </option>
              ))}
            </select>
            <button
              onClick={loadAgentsList}
              title="Refresh agents list"
              style={{
                width: "100%",
                padding: "6px 10px",
                background: "#1890ff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "600"
              }}
            >
              🔄 Refresh Agents
            </button>
          </div>

          {/* Database Selection Dropdown */}
          {(() => {
            console.log("🔍 Database dropdown condition check:", { selectedAgent: !!selectedAgent, agentName: selectedAgent?.name, databasesLength: databases.length, databases });
            return null;
          })()}
          {selectedAgent && databases.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: "600", color: "#666", textTransform: "uppercase" }}>
                Select Database:
              </label>
              <select
                value={selectedDatabase}
                onChange={(e) => setSelectedDatabase(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "2px solid #e8e8e8",
                  borderRadius: "6px",
                  fontSize: "13px",
                  background: "white",
                  cursor: "pointer",
                  marginBottom: "8px"
                }}
              >
                <option value="" disabled>Select a database...</option>
                {databases.map((db) => (
                  <option key={db} value={db}>
                    {db}
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedAgent && loadDatabasesList(selectedAgent.id)}
                title="Refresh databases list"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: "#52c41a",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "600"
                }}
              >
                🔄 Refresh Databases
              </button>
            </div>
          )}
          
          <h3 style={{ margin: "0 0 8px 0", color: "#333" }}>
            {selectedAgent?.name}
          </h3>
          <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#666" }}>
            {selectedAgent?.description || "No description"}
          </p>
          <button
            style={{
              width: "100%",
              padding: "8px",
              background: "#ff4d4f",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            🔌 Disconnect
          </button>
        </div>

        {/* Training Section */}
        <div style={{ padding: "20px", borderBottom: "1px solid #e8e8e8" }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#333" }}>🚀 Training</h4>
          
          <div style={{
            padding: "12px",
            background: "#f6ffed",
            border: "1px solid #b7eb8f",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#52c41a",
            marginBottom: "12px"
          }}>
            ✅ Agent is trained and ready
          </div>

          <button
            style={{
              width: "100%",
              padding: "10px",
              background: "#fa8c16",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Train Agent
          </button>
        </div>

        {/* Favourites Section */}
        <div style={{ padding: "20px", borderBottom: "1px solid #e8e8e8" }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#333" }}>⭐ Favourite Queries</h4>

          <input
            value={favFilter}
            onChange={(e) => setFavFilter(e.target.value)}
            placeholder="Search favourite by name..."
            style={{
              width: "100%",
              padding: "10px",
              border: "2px solid #e8e8e8",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "12px"
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "220px", overflowY: "auto" }}>
            {favorites.length > 0 ? (
              // Filter favorites by name if there's a filter
              favorites
                .filter(fav => favFilter === "" || fav.name.toLowerCase().includes(favFilter.toLowerCase()))
                .map(favorite => (
                  <div 
                    key={favorite.id} 
                    onClick={() => handleFavoriteClick(favorite)}
                    style={{
                      padding: "10px",
                      border: "1px solid #e8e8e8",
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: "white",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ fontWeight: 500, fontSize: "14px", marginBottom: "4px" }}>{favorite.name}</div>
                    <div style={{ fontSize: "12px", color: "#999" }}>
                      {new Date(favorite.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
            ) : (
              <div style={{ fontSize: "12px", color: "#999" }}>
                {selectedAgent ? "No favourites found" : "Select an agent to view favourites"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column",
        background: "#fafafa"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 30px",
          background: "white",
          borderBottom: "1px solid #e8e8e8"
        }}>
          <h2 style={{ margin: "0 0 4px 0", color: "#333" }}>Chat with AI Agent</h2>
          <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
            Ask questions about your data in natural language
          </p>
        </div>

        {/* Chat Content */}
        <div style={{ 
          flex: 1, 
          padding: "30px", 
          overflowY: "auto",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Question Input Area */}
          <div style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            marginBottom: "20px"
          }}>
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your data..."
              disabled={!isQuestionEditable}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // handleAsk(); // TODO: Wire this to actual API call
                }
              }}
              style={{
                width: "100%",
                padding: "12px",
                border: "2px solid #e8e8e8",
                borderRadius: "8px",
                fontSize: "14px",
                resize: "vertical",
                fontFamily: "inherit",
                marginBottom: "12px"
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <div style={{ fontSize: "12px", color: "#999" }}>
                Press Enter to send, Shift+Enter for new line
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setIsQuestionEditable(!isQuestionEditable)}
                  style={{
                    padding: "8px 12px",
                    background: isQuestionEditable ? "#f0f0f0" : "#ffc53d",
                    color: "#333",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "12px"
                  }}
                >
                  {isQuestionEditable ? "Lock" : "Edit"}
                </button>
                <button
                  onClick={() => setQuestion("")}
                  style={{
                    padding: "8px 12px",
                    background: "#ff4d4f",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "12px"
                  }}
                >
                  New Query
                </button>
                <button
                  onClick={handleAsk}
                  disabled={loading || !question.trim()}
                  style={{
                    padding: "10px 24px",
                    background: (loading || !question.trim()) ? "#d9d9d9" : "#1890ff",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: (loading || !question.trim()) ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}
                >
                  {loading ? "Thinking..." : "Ask Question"}
                </button>
              </div>
            </div>
          </div>

          {/* Chart/Table Visualization Section */}
          {response && (
            <div style={{
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              overflow: "hidden",
              marginBottom: "20px"
            }}>
              {/* Generated SQL Query Section */}
              <div style={{ padding: "20px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: "0 0 12px 0", color: "#1890ff", fontSize: "16px" }}>
                    Generated SQL Query
                  </h3>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      onClick={handleAddFavorite}
                      disabled={!response?.sql}
                      title="Add this NLQ + SQL to favourites"
                      style={{
                        padding: "6px 12px",
                        background: "#faad14",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: !response?.sql ? "not-allowed" : "pointer",
                        fontWeight: "600",
                        fontSize: "12px"
                      }}
                    >
                      ☆ Add to Favourites
                    </button>
                    <button
                      onClick={() => setIsEditingSQL(!isEditingSQL)}
                      style={{
                        padding: "6px 12px",
                        background: isEditingSQL ? "#f0f0f0" : "#ffc53d",
                        color: "#333",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "12px"
                      }}
                    >
                      {isEditingSQL ? "Cancel" : "Edit"}
                    </button>
                    {isEditingSQL && (
                      <button
                        onClick={applyEditedSQL}
                        disabled={loading || !editedSQL.trim()}
                        style={{
                          padding: "6px 12px",
                          background: (loading || !editedSQL.trim()) ? "#d9d9d9" : "#52c41a",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: (loading || !editedSQL.trim()) ? "not-allowed" : "pointer",
                          fontWeight: "600",
                          fontSize: "12px"
                        }}
                      >
                        {loading ? "Running..." : "Apply"}
                      </button>
                    )}
                  </div>
                </div>
                {!isEditingSQL ? (
                  <pre style={{
                    background: "#f6f8fa",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid #e1e4e8",
                    fontSize: "13px",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    margin: 0,
                    fontFamily: "'Monaco', 'Menlo', monospace"
                  }}>
                    {response.sql || "No SQL generated"}
                  </pre>
                ) : (
                  <textarea
                    rows={6}
                    value={editedSQL}
                    onChange={(e) => setEditedSQL(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #d9d9d9",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontFamily: "'Monaco', 'Menlo', monospace",
                      marginTop: "12px"
                    }}
                  />
                )}
              </div>

              {/* Chart/Table Tabs and Visualization */}
              <ChartSection data={response.data} chartType={chartType} setChartType={setChartType} />
            </div>
          )}

          {/* Empty State - Start a Conversation */}
          {!response && (
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: "#999",
              padding: "40px"
            }}>
              <div>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
                <h3 style={{ margin: "0 0 8px 0", color: "#666" }}>Start a Conversation</h3>
                <p style={{ margin: 0 }}>Ask a question about your data to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ExplorerTabs: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "dashboard", title: "Dashboard", type: "dashboard" },
    { id: "explorer-1", title: "Data Explorer", type: "explorer" },
  ]);
  const [activeId, setActiveId] = useState<string>(tabs[0].id);
  const [counter, setCounter] = useState(1);

  const addExplorer = () => {
    const next = counter + 1;
    const id = genId("explorer", next);
    const newTab: Tab = { id, title: `Data Explorer ${next}`, type: "explorer" };
    setTabs((s) => [...s, newTab]);
    setCounter(next);
    setActiveId(id);
  };

  const closeTab = (id: string) => {
    // prevent closing dashboard
    if (id === "dashboard") return;
    setTabs((s) => s.filter(t => t.id !== id));
    if (activeId === id) {
      // switch to dashboard if we closed the active one
      setActiveId("dashboard");
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f5f5f5" }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #eee", background: "white", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", overflowX: "auto" }}>
          {tabs.map((tab) => (
            <div key={tab.id} onClick={() => setActiveId(tab.id)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ padding: "8px 12px", borderRadius: 6, background: activeId === tab.id ? "#e6f7ff" : "transparent", border: activeId === tab.id ? "2px solid #1890ff" : "1px solid transparent", cursor: "pointer", fontWeight: 600 }}>
                {tab.title}
              </div>
              {tab.type === "explorer" && (
                <button onClick={() => closeTab(tab.id)} title="Close tab" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#999" }}>×</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={addExplorer} title="Add Data Explorer" style={{ padding: "8px 10px", borderRadius: 6, background: "#52c41a", color: "white", border: "none", cursor: "pointer", fontWeight: 700 }}>＋</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {tabs.map((tab) => (
          <div key={tab.id} style={{ display: tab.id === activeId ? "block" : "none", height: "100%" }}>
            {tab.type === "dashboard" ? <Dashboard /> : <DataExplorer tabTitle={tab.title} />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExplorerTabs;
