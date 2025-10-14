import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Hash } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function Messages() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Fetch channels
  const { data: channels } = useQuery({
    queryKey: ["channels", profile?.company_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("channels")
        .select(`
          *,
          channel_members!inner (user_id)
        `)
        .eq("channel_members.user_id", user?.id)
        .eq("company_id", profile?.company_id);
      return data || [];
    },
    enabled: !!user?.id && !!profile?.company_id,
  });

  // Fetch channel messages
  const { data: channelMessages } = useQuery({
    queryKey: ["channel-messages", selectedChannel?.id],
    queryFn: async () => {
      if (!selectedChannel?.id) return [];
      const { data } = await supabase
        .from("messages")
        .select(`
          *,
          sender:sender_id (id, name, email)
        `)
        .eq("channel_id", selectedChannel.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedChannel?.id,
  });

  // Fetch company users for adding to channels
  const { data: companyUsers } = useQuery({
    queryKey: ["company-users", profile?.company_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .eq("company_id", profile?.company_id)
        .neq("user_id", user?.id);
      return data || [];
    },
    enabled: !!profile?.company_id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedChannel?.id) return;
      
      const messageData = {
        sender_id: user?.id,
        content,
        channel_id: selectedChannel.id,
      };

      const { error } = await supabase.from("messages").insert([messageData]);
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["channel-messages"] });
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async () => {
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .insert([{
          company_id: profile?.company_id,
          name: newChannelName,
          description: newChannelDescription,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (channelError) throw channelError;

      // Add creator as member
      const members = [user?.id, ...selectedMembers];
      const { error: membersError } = await supabase
        .from("channel_members")
        .insert(members.map(userId => ({
          channel_id: channel.id,
          user_id: userId,
        })));

      if (membersError) throw membersError;
      return channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      setNewChannelName("");
      setNewChannelDescription("");
      setSelectedMembers([]);
      toast.success("Channel created successfully");
    },
    onError: () => {
      toast.error("Failed to create channel");
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["channel-messages"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleSendMessage = () => {
    if (!message.trim() || !selectedChannel) return;
    sendMessageMutation.mutate(message);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Messages</h1>
            <p className="text-lg text-muted-foreground mt-1">
              Collaborate with your team
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Hash className="mr-2 h-4 w-4" />
                New Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Channel Name</Label>
                  <Input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="general, marketing, etc."
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    placeholder="What's this channel about?"
                  />
                </div>
                <div>
                  <Label>Add Members</Label>
                  <ScrollArea className="h-48 border rounded-md p-4">
                    {companyUsers?.map((user) => (
                      <div key={user.user_id} className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={user.user_id}
                          checked={selectedMembers.includes(user.user_id)}
                          onCheckedChange={(checked) => {
                            setSelectedMembers(
                              checked
                                ? [...selectedMembers, user.user_id]
                                : selectedMembers.filter(id => id !== user.user_id)
                            );
                          }}
                        />
                        <label htmlFor={user.user_id} className="text-sm cursor-pointer">
                          {user.name} ({user.email})
                        </label>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                <Button
                  onClick={() => createChannelMutation.mutate()}
                  disabled={!newChannelName.trim()}
                  className="w-full"
                >
                  Create Channel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
          {/* Sidebar */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Channels</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {channels?.map((channel) => (
                  <div
                    key={channel.id}
                    className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-accent ${
                      selectedChannel?.id === channel.id ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelectedChannel(channel)}
                  >
                    <Hash className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{channel.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {channel.description}
                      </p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2 flex flex-col">
            {selectedChannel ? (
              <>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    {selectedChannel.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-4">
                  <ScrollArea className="flex-1 pr-4 mb-4">
                    <div className="space-y-4">
                      {channelMessages?.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${
                            msg.sender_id === user?.id ? "flex-row-reverse" : ""
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{msg.sender?.name?.[0] || "U"}</AvatarFallback>
                          </Avatar>
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.sender_id === user?.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {msg.sender_id !== user?.id && (
                              <p className="text-xs font-medium mb-1">{msg.sender?.name}</p>
                            )}
                            <p className="text-sm">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={!message.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a channel to start messaging
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
