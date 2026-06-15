import { errorHandler } from "@/error-boundary/globalErrorHandler";
import nextAxios from "@/helpers/next-axios";

// Client-side API calls for the work order feature. Uses nextAxios
// (baseURL = SITE_URL + "/api") so requests hit this app's own routes;
// the interceptor attaches the session bearer token. The server resolves
// the principal via getAuthPrincipal and enforces companyId scoping.

const base = (companyId: number, invoiceId: string) =>
  `/estimate/${companyId}/${invoiceId}`;

export const getWorkOrderData = async (
  companyId: number,
  invoiceId: string,
) => {
  try {
    const res = await nextAxios.get(`${base(companyId, invoiceId)}/workorder`);
    return res.data?.data;
  } catch (error) {
    throw errorHandler(error);
  }
};

export const saveWorkOrder = async (
  companyId: number,
  invoiceId: string,
  dueDate: string,
) => {
  try {
    const res = await nextAxios.patch(
      `${base(companyId, invoiceId)}/workorder`,
      { dueDate },
    );
    return res.data?.data;
  } catch (error) {
    throw errorHandler(error);
  }
};

export const getTechnicians = async (
  companyId: number,
  invoiceId: string,
  invoiceItemId?: number,
) => {
  try {
    const res = await nextAxios.get(
      `${base(companyId, invoiceId)}/technicians`,
      { params: invoiceItemId != null ? { invoiceItemId } : undefined },
    );
    return res.data?.data;
  } catch (error) {
    throw errorHandler(error);
  }
};

export const addTechnician = async (
  companyId: number,
  invoiceId: string,
  payload: any,
) => {
  try {
    const res = await nextAxios.post(
      `${base(companyId, invoiceId)}/technicians`,
      payload,
    );
    return res.data?.data;
  } catch (error) {
    throw errorHandler(error);
  }
};

export const updateTechnician = async (
  companyId: number,
  invoiceId: string,
  techId: number,
  payload: any,
) => {
  try {
    const res = await nextAxios.patch(
      `${base(companyId, invoiceId)}/technicians/${techId}`,
      payload,
    );
    return res.data?.data;
  } catch (error) {
    throw errorHandler(error);
  }
};

export const deleteTechnician = async (
  companyId: number,
  invoiceId: string,
  techId: number,
) => {
  try {
    const res = await nextAxios.delete(
      `${base(companyId, invoiceId)}/technicians/${techId}`,
    );
    return res.data;
  } catch (error) {
    throw errorHandler(error);
  }
};

export const deleteTechnicianImage = async (
  companyId: number,
  invoiceId: string,
  techId: number,
  imageId: number,
) => {
  try {
    const res = await nextAxios.delete(
      `${base(companyId, invoiceId)}/technicians/${techId}/images/${imageId}`,
    );
    return res.data;
  } catch (error) {
    throw errorHandler(error);
  }
};

export const createRedo = async (
  companyId: number,
  invoiceId: string,
  redos: { serviceId: number; technicianId: number; notes: string }[],
) => {
  try {
    const res = await nextAxios.post(`${base(companyId, invoiceId)}/redo`, {
      redos,
    });
    return res.data;
  } catch (error) {
    throw errorHandler(error);
  }
};
