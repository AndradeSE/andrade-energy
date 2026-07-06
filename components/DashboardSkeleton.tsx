import { View, ViewStyle } from "react-native";

type SkeletonProps = {
  width?: ViewStyle["width"];
  height?: number;
};

function Skeleton({
  width = "100%",
  height = 18,
}: SkeletonProps) {
  return (
    <View
      style={{
        width,
        height,
        backgroundColor: "#1E293B",
        borderRadius: 8,
        marginBottom: 12,
      }}
    />
  );
}

export default function DashboardSkeleton() {
  return (
    <View style={{ padding: 20 }}>
      <Skeleton width={180} height={30} />
      <Skeleton width={240} />

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          marginTop: 20,
        }}
      >
        {[1, 2, 3, 4].map((item) => (
          <View
            key={item}
            style={{
              width: "48%",
              height: 120,
              backgroundColor: "#1E293B",
              borderRadius: 18,
              marginBottom: 15,
            }}
          />
        ))}
      </View>

      {[1, 2, 3].map((item) => (
        <View
          key={item}
          style={{
            marginTop: 18,
            backgroundColor: "#1E293B",
            borderRadius: 18,
            padding: 18,
          }}
        >
          <Skeleton width={180} />
          <Skeleton />
          <Skeleton />
          <Skeleton width="70%" />
        </View>
      ))}
    </View>
  );
}