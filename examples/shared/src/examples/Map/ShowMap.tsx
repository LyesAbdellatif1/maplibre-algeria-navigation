import { MapView, PointAnnotation } from "@maplibre/maplibre-react-native";
import { View } from "react-native";
import { sheet } from "../../styles/sheet";

export function ShowMap() {
  return (
    <MapView
      style={sheet.matchParent}
      mapStyle="http://10.0.2.2:8080/styles/osm-liberty/style.json"
    >
      <PointAnnotation id="test" coordinate={[3.0588, 36.7538]}>
        <View
          style={{
            width: 12,
            height: 12,
            backgroundColor: "red",
            borderRadius: 6,
          }}
        />
      </PointAnnotation>
    </MapView>
  );
}