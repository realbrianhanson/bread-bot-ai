import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface BrowserProfile {
  id: string;
  user_id: string;
  name: string;
  browser_use_profile_id?: string;
  description?: string;
  sites?: string[];
  created_at: string;
  last_used_at?: string;
}

export const useBrowserProfiles = () => {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchProfiles = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-profile', {
        body: { action: 'list' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setProfiles(response.data.profiles || []);
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch profiles',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createProfile = useCallback(
    async (name: string, description?: string, sites?: string[]) => {
      if (!user) return;

      setIsLoading(true);
      try {
        const response = await supabase.functions.invoke('manage-profile', {
          body: { action: 'create', name, description, sites },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        toast({
          title: 'Profile Created',
          description: `Profile "${name}" has been created successfully`,
        });

        await fetchProfiles();
        return response.data.profile;
      } catch (error: any) {
        console.error('Error creating profile:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to create profile',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, fetchProfiles]
  );

  const deleteProfile = useCallback(
    async (profileId: string) => {
      if (!user) return;

      setIsLoading(true);
      try {
        const response = await supabase.functions.invoke('manage-profile', {
          body: { action: 'delete', profileId },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        toast({
          title: 'Profile Deleted',
          description: 'Profile has been deleted successfully',
        });

        if (selectedProfileId === profileId) {
          setSelectedProfileId(null);
        }

        await fetchProfiles();
      } catch (error: any) {
        console.error('Error deleting profile:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete profile',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, selectedProfileId, fetchProfiles]
  );

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user, fetchProfiles]);

  return {
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    isLoading,
    createProfile,
    deleteProfile,
    refreshProfiles: fetchProfiles,
  };
};
