import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { supabase } from '../config/supabase';
import { GeolocationService } from '../services/geolocation';
import { PhotoService } from '../services/photos';

interface Lead {
  id: string;
  name: string;
  email?: string;
  company?: string;
  status: string;
  stage: string;
}

export const LeadsScreen: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const handleFieldVisit = async (leadId: string) => {
    try {
      // Demander la permission de géolocalisation
      const hasPermission = await GeolocationService.requestPermissions();
      if (!hasPermission) {
        alert('Permission de géolocalisation requise');
        return;
      }

      // Prendre une photo
      const photo = await PhotoService.pickPhoto();
      
      // Enregistrer la visite terrain
      await GeolocationService.recordFieldVisit(leadId, 'Visite terrain', photo ? [photo] : []);
      alert('Visite terrain enregistrée');
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeads();
    setRefreshing(false);
  };

  const renderLead = ({ item }: { item: Lead }) => (
    <TouchableOpacity style={styles.leadCard}>
      <Text style={styles.leadName}>{item.name}</Text>
      {item.company && (
        <Text style={styles.leadCompany}>{item.company}</Text>
      )}
      {item.email && (
        <Text style={styles.leadEmail}>{item.email}</Text>
      )}
      <View style={styles.leadFooter}>
        <View style={[styles.badge, styles[`badge_${item.status}`]]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
        <TouchableOpacity
          style={styles.visitButton}
          onPress={() => handleFieldVisit(item.id)}
        >
          <Text style={styles.visitButtonText}>Visite terrain</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={leads}
        renderItem={renderLead}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun lead</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  leadCompany: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  leadEmail: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 12,
  },
  leadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badge_new: { backgroundColor: '#dbeafe' },
  badge_contacted: { backgroundColor: '#fef3c7' },
  badge_qualified: { backgroundColor: '#d1fae5' },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1e293b',
  },
  visitButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  visitButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
});

