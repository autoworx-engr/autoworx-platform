'use server';

import { getCompanyId } from '@/lib/companyId';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

const getSms = async (
    clientId: number,
    params?: Prisma.ClientSMSFindManyArgs
) => {
    const companyId = await getCompanyId();
    const { where, ...restParams } = params || {};
    const totalSmsCount = await db.clientSMS.count({
        where: {
            clientId: +clientId!,
            companyId,
        },
    });

    const clientSms = await db.clientSMS.findMany({
        where: {
            clientId: +clientId,
            companyId,
            ...(where || {}),
        },
        include: {
            attachments: true,
        },
        ...restParams,
    });

    return {
        data: clientSms,
        totalSmsCount,
    };
};

export default getSms;
