import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface TabDefinition {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface TabBarProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}

export default function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? '#FFD700' : '#666'}
                style={styles.tabIcon}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
  },
  scrollContent: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    minWidth: '100%',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  tabActive: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#FFD70040',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#FFD700',
  },
});
