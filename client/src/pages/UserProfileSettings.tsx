import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { User, UpdateUser, PasswordChange } from '@shared/schema';
import { checkPasswordStrength } from '@/utils/password-strength';
import { useAuth } from '@/hooks/use-auth';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Form schemas
const profileFormSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  avatarUrl: z.string().url('Please enter a valid URL').optional().nullable(),
  locale: z.string(),
  timezone: z.string(),
  notificationPrefs: z.record(z.boolean()).optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine(data => data.newPassword !== data.currentPassword, {
  message: "New password must be different from current password",
  path: ['newPassword'],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const UserProfileSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Create profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: user?.email || '',
      avatarUrl: user?.avatarUrl || '',
      locale: user?.locale || 'en-US',
      timezone: user?.timezone || 'UTC',
      notificationPrefs: typeof user?.notificationPrefs === 'object' 
        ? user?.notificationPrefs as Record<string, boolean>
        : { emailUpdates: true, projectNotifications: true },
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onChange', // Enable real-time validation
  });

  // Update forms when user data is loaded
  useEffect(() => {
    if (user) {
      profileForm.reset({
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
        locale: user.locale || 'en-US',
        timezone: user.timezone || 'UTC',
        notificationPrefs: typeof user.notificationPrefs === 'object' 
          ? user.notificationPrefs as Record<string, boolean>
          : { emailUpdates: true, projectNotifications: true },
      });
    }
  }, [user, profileForm]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const updateData: UpdateUser = {
        email: data.email,
        avatarUrl: data.avatarUrl,
        locale: data.locale,
        timezone: data.timezone,
        notificationPrefs: data.notificationPrefs,
      };
      const res = await apiRequest('PUT', `/api/users/${user?.id}`, updateData);
      return await res.json();
    },
    onSuccess: (data: User) => {
      queryClient.setQueryData(['/api/user'], data);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update profile: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      // Client-side validation 
      try {
        // Double-check the passwords match
        if (data.newPassword !== data.confirmPassword) {
          passwordForm.setError('confirmPassword', {
            type: 'manual',
            message: "Passwords don't match"
          });
          throw new Error("Passwords don't match");
        }
        
        // Double-check new password isn't the same as current
        if (data.newPassword === data.currentPassword) {
          passwordForm.setError('newPassword', {
            type: 'manual',
            message: "New password must be different from current password"
          });
          throw new Error("New password must be different from current password");
        }
        
        const passwordData: PasswordChange = {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        };
        
        // Make the API request
        const res = await apiRequest('POST', `/api/users/${user?.id}/change-password`, passwordData);
        
        // Handle API error responses
        if (!res.ok) {
          const errorData = await res.json();
          
          // Handle specific error cases
          if (errorData.message === 'Current password is incorrect') {
            // Handle incorrect current password specifically
            passwordForm.setError('currentPassword', {
              type: 'manual',
              message: 'Current password is incorrect'
            });
          } else if (errorData.errors && Array.isArray(errorData.errors)) {
            // Handle validation errors from the server
            errorData.errors.forEach((err: any) => {
              const field = err.path[0] as keyof PasswordFormValues;
              passwordForm.setError(field, {
                type: 'manual',
                message: err.message
              });
            });
          }
          
          throw new Error(errorData.message || 'Failed to change password');
        }
        
        return await res.json();
      } catch (error: any) {
        console.error('Password change error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Password changed',
        description: 'Your password has been changed successfully.',
        variant: 'default',
        duration: 5000,
      });
      
      // Reset the form
      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (error: Error) => {
      // Only show global error toast for errors not already handled as field errors
      const specificErrors = [
        'Current password is incorrect',
        "Passwords don't match",
        "New password must be different from current password"
      ];
      
      if (!specificErrors.includes(error.message)) {
        toast({
          title: 'Error',
          description: `Failed to change password: ${error.message}`,
          variant: 'destructive',
        });
      }
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      try {
        // First try to delete the account
        const res = await apiRequest('DELETE', `/api/users/${user?.id}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to delete account');
        }
        
        // Use our logoutMutation to handle session termination
        logoutMutation.mutate();
        
        return await res.json();
      } catch (error) {
        console.error('Error during account deletion:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Account deleted',
        description: 'Your account has been deleted. You will be redirected to the login page.',
        duration: 3000,
      });
      
      // Clean up all user data from localStorage
      localStorage.clear(); // Remove ALL localStorage items
      
      // Clear React Query cache to remove any cached user data
      queryClient.clear();
      
      // Let toast display before redirecting
      setTimeout(() => {
        // Redirect to home/login page
        window.location.href = '/';  
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete account: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handle profile form submission
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Handle password form submission
  const onPasswordSubmit = (data: PasswordFormValues) => {
    changePasswordMutation.mutate(data);
  };

  // Handle notification preferences change
  const handleNotificationToggle = (key: string) => {
    const currentPrefs = profileForm.getValues('notificationPrefs') || {};
    profileForm.setValue('notificationPrefs', {
      ...currentPrefs,
      [key]: !currentPrefs[key],
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="avatarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avatar URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/avatar.jpg" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormDescription>
                            Enter a URL for your profile picture.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="locale"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="en-US">English (US)</SelectItem>
                              <SelectItem value="en-GB">English (UK)</SelectItem>
                              <SelectItem value="fr-FR">French</SelectItem>
                              <SelectItem value="es-ES">Spanish</SelectItem>
                              <SelectItem value="de-DE">German</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                              <SelectItem value="America/New_York">Eastern Time (US & Canada)</SelectItem>
                              <SelectItem value="America/Chicago">Central Time (US & Canada)</SelectItem>
                              <SelectItem value="America/Denver">Mountain Time (US & Canada)</SelectItem>
                              <SelectItem value="America/Los_Angeles">Pacific Time (US & Canada)</SelectItem>
                              <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                              <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                              <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                              <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Notification Preferences</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="emailUpdates" className="flex flex-col space-y-1">
                            <span>Email Updates</span>
                            <span className="text-sm text-muted-foreground">
                              Receive updates about your account via email
                            </span>
                          </Label>
                          <Switch
                            id="emailUpdates"
                            checked={profileForm.getValues('notificationPrefs')?.emailUpdates || false}
                            onCheckedChange={() => handleNotificationToggle('emailUpdates')}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="projectNotifications" className="flex flex-col space-y-1">
                            <span>Project Notifications</span>
                            <span className="text-sm text-muted-foreground">
                              Get notified about changes to your projects
                            </span>
                          </Label>
                          <Switch
                            id="projectNotifications"
                            checked={profileForm.getValues('notificationPrefs')?.projectNotifications || false}
                            onCheckedChange={() => handleNotificationToggle('projectNotifications')}
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="currentPassword">Current Password</FormLabel>
                          <FormControl>
                            <Input 
                              id="currentPassword"
                              type="password" 
                              {...field} 
                              data-testid="current-password-input"
                              autoComplete="current-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => {
                        // Get real-time password strength feedback
                        const strength = field.value ? checkPasswordStrength(field.value) : { 
                          strength: 'weak', 
                          message: 'Enter a password', 
                          color: 'text-gray-400'
                        };
                        
                        return (
                          <FormItem>
                            <FormLabel htmlFor="newPassword">New Password</FormLabel>
                            <FormControl>
                              <Input 
                                id="newPassword"
                                type="password" 
                                {...field} 
                                data-testid="new-password-input"
                                aria-describedby="password-strength password-requirements"
                                autoComplete="new-password"
                              />
                            </FormControl>
                            
                            {/* Password strength indicator */}
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm ${strength.color}`} id="password-strength">
                                  {strength.message}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    strength.strength === 'weak' ? 'bg-red-500 w-1/3' : 
                                    strength.strength === 'medium' ? 'bg-amber-500 w-2/3' : 
                                    'bg-green-500 w-full'
                                  }`}
                                  role="progressbar" 
                                  aria-valuenow={
                                    strength.strength === 'weak' ? 33 : 
                                    strength.strength === 'medium' ? 66 : 
                                    100
                                  }
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                />
                              </div>
                            </div>
                            
                            <FormDescription>
                              Password must include uppercase, lowercase, numbers, and special characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="confirmPassword">Confirm New Password</FormLabel>
                          <FormControl>
                            <Input 
                              id="confirmPassword" 
                              type="password" 
                              {...field} 
                              data-testid="confirm-password-input"
                              autoComplete="new-password"
                            />
                          </FormControl>
                          <FormDescription id="password-match-desc">
                            Must match the password entered above
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger" className="space-y-6">
            <Card className="border-red-200">
              <CardHeader className="bg-red-50 rounded-t-lg">
                <CardTitle className="text-red-700">Danger Zone</CardTitle>
                <CardDescription className="text-red-600">
                  These actions are irreversible. Please proceed with caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" data-testid="trigger-delete-account">Delete Account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p className="font-medium text-destructive">
                          This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                        </p>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          <li>All your projects will be deleted</li>
                          <li>Your organization memberships will be removed</li>
                          <li>All personal data will be erased</li>
                          <li>You will be immediately logged out of the system</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => deleteAccountMutation.mutate()}
                        disabled={deleteAccountMutation.isPending}
                        data-testid="confirm-delete-account"
                      >
                        {deleteAccountMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Yes, Delete My Account'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserProfileSettings;