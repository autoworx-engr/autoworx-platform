'use client';

import React, { useCallback, useEffect, useState } from 'react';
import SmsBox from './SmsBox';
import SendSms from './SendSms';
import { ClientSMS, ClientSmsAttachments } from '@prisma/client';
import { useGetCurrentUser } from '@/utils/useGetCurrentUser';
import { pusher } from '@/lib/pusher/client';
import { readClientSMS } from '@/actions/communication/client/chat-track';
import { errorToast } from '@/lib/toast';
import { errorHandler } from '@/error-boundary/globalErrorHandler';
import { useClientCommunicationStore } from '@/stores/client-store';
import { useQueryClient } from '@tanstack/react-query';
import { smsQueryKey } from '../../../_utils/queryKey';

type TProps = { clientId: number };

export default function SmsContainer({ clientId }: TProps) {
    const queryClient = useQueryClient();
    const [messages, setMessages] = useState();
    const user = useGetCurrentUser();

    const setClientConversationTrack = useClientCommunicationStore(
        state => state.setClientConversationTrack
    );

    // subscribe to pusher channel for realtime updates
    useEffect(() => {
        pusher
            .subscribe(`sms-${user?.companyId}-${clientId}`)
            .bind(
                'sms',
                (
                    data: ClientSMS & { attachments?: ClientSmsAttachments[] }
                ) => {
                    if (!data) return;

                    // update caches data
                    queryClient?.setQueryData(
                        smsQueryKey.allSmsByClientId(clientId),
                        (oldData: any) => {
                            if (!oldData) return oldData;
                            if (oldData.pages.length === 0) return oldData;
                            const initialPage = oldData.pages[0];
                            const updatedLastPageMessages = [
                                data,
                                ...initialPage.data,
                            ];
                            const updatedPages = oldData.pages.map(
                                (
                                    page: {
                                        data: ClientSMS[];
                                        total: number;
                                        nextPage: number;
                                        hasMore: boolean;
                                    },
                                    index: number
                                ) => {
                                    if (index === 0) {
                                        return {
                                            ...page,
                                            data: updatedLastPageMessages,
                                        };
                                    }
                                    return page;
                                }
                            );
                            return {
                                ...oldData,
                                pages: updatedPages,
                            };
                        }
                    );
                    // setMessages(prevMessages => [...prevMessages, data]);
                }
            );
        return () => {
            pusher
                .unbind('mail')
                .unsubscribe(`mail-${user?.companyId}-${clientId}`);
        };
    }, []);

    // update client unread messages
    const updateSmsUnReadMessages = useCallback(async () => {
        try {
            const readClientSms = await readClientSMS(clientId);
            setClientConversationTrack(readClientSms);
        } catch (err) {
            const formattedError = errorHandler(err);
            errorToast(formattedError.message);
        }
    }, [clientId]);

    useEffect(() => {
        updateSmsUnReadMessages();
    }, []);

    return (
        <div className="flex h-full flex-col gap-0">
            <div className="flex-1 overflow-hidden">
                <SmsBox clientId={clientId} />
            </div>
            {/* Input area - always stays at bottom */}
            <div className="flex-shrink-0">
                <SendSms clientId={clientId} />
            </div>
        </div>
    );
}
