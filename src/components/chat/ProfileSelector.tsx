import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, User, Trash2 } from 'lucide-react';
import { useBrowserProfiles } from '@/hooks/useBrowserProfiles';

interface ProfileSelectorProps {
  onProfileSelect?: (profileId: string | null) => void;
}

const ProfileSelector = ({ onProfileSelect }: ProfileSelectorProps) => {
  const {
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    isLoading,
    createProfile,
    deleteProfile,
  } = useBrowserProfiles();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');

  const handleProfileChange = (value: string) => {
    const profileId = value === 'none' ? null : value;
    setSelectedProfileId(profileId);
    onProfileSelect?.(profileId);
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;

    await createProfile(newProfileName, newProfileDescription);
    setNewProfileName('');
    setNewProfileDescription('');
    setIsCreateDialogOpen(false);
  };

  const handleDeleteProfile = async (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this profile?')) {
      await deleteProfile(profileId);
    }
  };

  return (
    <Card className="p-4 bg-muted/30 backdrop-blur-sm border-border/50">
      <div className="flex items-center gap-3">
        <User className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Browser Profile</Label>
        
        <Select
          value={selectedProfileId || 'none'}
          onValueChange={handleProfileChange}
          disabled={isLoading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="No profile (fresh session)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No profile (fresh session)</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{profile.name}</span>
                  {profile.sites && profile.sites.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({profile.sites.join(', ')})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Plus className="h-4 w-4 mr-1" />
              New Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Browser Profile</DialogTitle>
              <DialogDescription>
                Create a profile to save login sessions and cookies across tasks.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Profile Name</Label>
                <Input
                  id="profile-name"
                  placeholder="e.g., Shopping Profile"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-description">
                  Description (optional)
                </Label>
                <Input
                  id="profile-description"
                  placeholder="e.g., For Amazon and eBay tasks"
                  value={newProfileDescription}
                  onChange={(e) => setNewProfileDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProfile}
                  disabled={!newProfileName.trim() || isLoading}
                >
                  Create Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {selectedProfileId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-destructive hover:text-destructive"
            onClick={(e) => handleDeleteProfile(selectedProfileId, e)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {selectedProfileId && (
        <p className="text-xs text-muted-foreground mt-2">
          Using saved profile - login sessions will persist across tasks
        </p>
      )}
    </Card>
  );
};

export default ProfileSelector;
