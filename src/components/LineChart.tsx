// src/components/LineChartComponent.tsx

import React from "react";
import { LineChart } from "react-native-chart-kit";
import { Dimensions, View, Text } from "react-native";

const screenWidth = Dimensions.get("window").width;

const chartConfig = {
  backgroundColor: "#ffffff",
  backgroundGradientFrom: "#f9f9f9",
  backgroundGradientTo: "#ffffff",
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(30, 144, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  propsForDots: {
    r: "4",
    strokeWidth: "1",
    stroke: "#1e90ff",
  },
};

export default function LineChartComponent({ labels, dataPoints }) {
  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>
        📈 Temperature Trend
      </Text>
      <LineChart
        data={{
          labels: labels,
          datasets: [{ data: dataPoints }],
        }}
        width={screenWidth - 40}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 8,
        }}
      />
    </View>
  );
}
