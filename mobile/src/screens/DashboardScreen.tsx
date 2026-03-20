import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../config/supabase';
import { OfflineSyncService } from '../services/offlineSync';

export const DashboardScreen: React.FC = () => {
  const [stats, setStats] = useState({
    tasks: 0,
    leads: 0,
    projects: 0,
    pendingSync: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
    loadPendingSync();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger les statistiques
      const [tasksResult, leadsResult, projectsResult] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('leads').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('projects').select('id', { count: 'exact' }).eq('user_id', user.id),
      ]);

      setStats({
        tasks: tasksResult.count || 0,
        leads: leadsResult.count || 0,
        projects: projectsResult.count || 0,
        pendingSync: stats.pendingSync,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPendingSync = async () => {
    const count = await OfflineSyncService.getPendingActionsCount();
    setStats(prev => ({ ...prev, pendingSync: count }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    await loadPendingSync();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>Tableau de bord</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.tasks}</Text>
            <Text style={styles.statLabel}>Tâches</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.leads}</Text>
            <Text style={styles.statLabel}>Leads</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.projects}</Text>
            <Text style={styles.statLabel}>Projets</Text>
          </View>
        </View>

        {stats.pendingSync > 0 && (
          <TouchableOpacity
            style={styles.syncCard}
            onPress={async () => {
              await OfflineSyncService.syncPendingActions();
              await loadPendingSync();
            }}
          >
            <Text style={styles.syncText}>
              {stats.pendingSync} action{stats.pendingSync > 1 ? 's' : ''} en attente de synchronisation
            </Text>
            <Text style={styles.syncButton}>Synchroniser</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1e293b',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  syncCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  syncButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
});

