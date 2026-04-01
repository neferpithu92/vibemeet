-- 042: Direct Message Read Receipts
-- Adds read_at column to direct_messages for VEL transparency.

ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Policy for updating read receipts (only by the recipient)
-- recipient is the user who is NOT the sender_id of the message
-- but is part of the conversation.
CREATE POLICY "Users can mark messages as read"
ON public.direct_messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = direct_messages.conversation_id
        AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
        AND auth.uid() <> direct_messages.sender_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = direct_messages.conversation_id
        AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
        AND auth.uid() <> direct_messages.sender_id
    )
);
