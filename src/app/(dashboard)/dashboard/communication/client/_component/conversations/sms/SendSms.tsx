'use client';
import updateFirstContactTimeClient from '@/actions/communication/client/updateFirstContactTimeClient';
import { errorToast } from '@/lib/toast';
import { clientListStore } from '@/stores/client-store';
import Image from 'next/image';
import React, { useRef, useState, useTransition } from 'react';
import { MdSend } from 'react-icons/md';
import useSmsSendMutation from '../../../_hooks/useSmsSendMutation';
import AttachmentInput from '../AttachmentInput';

type TProps = {
    clientId: number;
};

export default function SendSms({ clientId }: TProps) {
    const { clientList, setClientList } = clientListStore();
    const { mutate, isSuccess, isPending } = useSmsSendMutation(clientId);

    const [files, setFiles] = useState<File[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const handleSendMessage = async (
        e: React.FormEvent<HTMLFormElement | HTMLTextAreaElement>
    ) => {
        e.preventDefault();
        const tempId = `temp-${Date.now()}`;

        // Avoid sending empty message with no attachments
        if (!messageInput.trim() && files.length === 0) return;

        // Create optimistic message
        const optimisticMessage = {
            id: tempId,
            clientId,
            message: messageInput,
            files,
            createdAt: new Date().toISOString(),
            isSending: true,
            sentBy: 'Company',
        };

        setMessageInput('');
        setFiles([]);
        try {
            mutate(optimisticMessage);

            if (isSuccess) {
                await updateFirstContactTimeClient(clientId);

                // Replace temp message with real one
                // setMessages((prev) =>
                //   prev.map((msg) => (msg.id === tempId ? res.data : msg)),
                // );

                // Push this client to top
                const currentClient = clientList?.find(c => c.id === clientId);
                const filtered = clientList?.filter(c => c.id !== clientId);
                currentClient && setClientList([currentClient, ...filtered]);
            } else {
                throw new Error('Send failed');
            }
        } catch (err) {
            // Remove optimistic message on failure
            // setMessages(prev => prev.filter(msg => msg.id !== tempId));
            errorToast('Error sending message');
        }
    };

    return (
        <>
            <AttachmentInput
                className="bottom-[90px]"
                multiAttachmentFile={files}
                onAllRemove={() => setFiles([])}
                onRemoveAttachment={attachmentName =>
                    setFiles(prev =>
                        prev.filter(file => file.name !== attachmentName)
                    )
                }
            />
            <form
                className="flex h-[51px] items-center gap-x-2 rounded-b-md bg-[#D9D9D9] px-2 py-1"
                onSubmit={handleSendMessage}
            >
                <input
                    onChange={e => {
                        setFiles(Array.from(e?.target?.files || []));
                        e.target.value = '';
                    }}
                    multiple
                    type="file"
                    className="hidden"
                    ref={fileRef}
                />
                <Image
                    src="/icons/Attachment.svg"
                    alt="attachment"
                    width={20}
                    height={20}
                    className="cursor-pointer"
                    onClick={() => {
                        fileRef?.current?.click();
                    }}
                />
                <div className="flex h-full w-full items-center gap-x-2 rounded-md bg-background">
                    <textarea
                        placeholder="Send Message..."
                        className="h-full w-full  rounded-md border-none px-2 py-0 text-[16px] focus:outline-none"
                        value={messageInput}
                        style={{
                            WebkitAppearance: 'none',
                            maxHeight: '100%',
                            WebkitTextSizeAdjust: '100%',
                            touchAction: 'manipulation',
                        }}
                        onChange={e => setMessageInput(e.target.value)}
                        // onKeyDown={(event) =>
                        //   startTransaction(() => {
                        //     if (event.key === "Enter" && !event.shiftKey) {
                        //       event.preventDefault(); // Prevents a new line
                        //       handleSendMessage(event); // Call your send function
                        //     }
                        //   })
                        // }

                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault(); // Prevents a new line
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <button
                        disabled={
                            isPending || (!messageInput && files.length === 0)
                        }
                        type="submit"
                        className="px-2 text-[#006D77] disabled:text-gray-400"
                    >
                        <MdSend className="text-2xl" />
                        {/* <Image src="/icons/Send.svg" alt="send" width={20} height={20} /> */}
                    </button>
                </div>
            </form>
        </>
    );
}
