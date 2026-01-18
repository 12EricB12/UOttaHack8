{/* score, tips, time of completion */}
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function ResultsScreen({navigation}: {navigation: any}) {
  return (
    <View style={styles.container}>
        
    </View> 
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 80,
        alignItems: "center",
        backgroundColor: "#ee8d2f",
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 20,
        textDecorationLine: "underline",
    },
    table: {
        width: "90%",
        borderWidth: 1,
        borderColor: "#000",
        borderRadius: 8,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        padding: 15,
        justifyContent: "space-between",
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
    },
    value: {
        fontSize: 16,
        color: "#000",
    },
    bottomBar: {
        flexDirection: "row",
        height: 79,
        borderTopWidth: 5,
        borderTopColor: "#000",
        justifyContent: "space-around",
        position: "absolute",
        bottom: 5,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingBottom: 19, // Padding for safe area usually
        backgroundColor: "#ee8d2f",
    },
    navButton: {
        padding: 10,
    },
    navText: {
        fontSize: 16,
        color: "#333",
        fontWeight: "600",
    },
});

export default ResultsScreen;