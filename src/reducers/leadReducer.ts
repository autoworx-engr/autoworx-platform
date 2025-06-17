import { actionTypes, TActionType } from "@/constants/lead.constant";
import { ColumnWithLeads } from "@/types/invoiceLead";
import { Appointment, Lead, Tag, Task, User } from "@prisma/client";
import moment from "moment";

export interface TColumnAction<T> {
  type: TActionType[keyof TActionType];
  payload?: T;
}

export function leadReducer<T>(
  state: ColumnWithLeads[],
  action: TColumnAction<T>,
) {
  switch (action.type) {
    case actionTypes.MORE_LEADS: {
      const { columnId, leads } = action.payload as {
        columnId: number;
        leads: T[];
      };
      return state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            leads: [...column.leads, ...leads],
          };
        }
        return column;
      });
    }

    case actionTypes.DRAG_END: {
      const { source, destination, draggableId } = action.payload as {
        source: { droppableId: string; index: number };
        destination: { droppableId: string; index: number };
        draggableId: string;
      };

      if (!destination) {
        return state; // If dropped outside, do nothing
      }

      // Find the source and destination columns by their IDs
      const sourceColumnIndex = state.findIndex(
        (_, index) => index.toString() === source.droppableId,
      );

      const destinationColumnIndex = state.findIndex(
        (_, index) => index.toString() === destination.droppableId,
      );

      if (sourceColumnIndex === -1 || destinationColumnIndex === -1) {
        return state; // Invalid column indices
      }

      const sourceColumn = state[sourceColumnIndex];
      const destinationColumn = state[destinationColumnIndex];

      // Remove the lead from the source column
      const findDraggableLead = sourceColumn.leads.find(
        (lead) => lead.id.toString() === draggableId,
      );

      if (!findDraggableLead) {
        return state; // If the lead is not found, do nothing
      }

      const updatedSourceLeads = sourceColumn.leads.filter(
        (lead) => lead.id.toString() !== draggableId,
      );

      destinationColumn.leads.splice(destination.index, 0, {
        ...findDraggableLead,
      });

      const updatedDestinationColumn = {
        ...destinationColumn,
        leads: destinationColumn.leads,
      };

      const updatedSourceColumn = {
        ...sourceColumn,
        leads: updatedSourceLeads,
      };

      return state.map((column) => {
        if (column.id === sourceColumn.id) {
          return updatedSourceColumn; // Update the source column
        }
        if (column.id === destinationColumn.id) {
          return updatedDestinationColumn; // Update the destination column
        }
        return column; // Return other columns unchanged
      });
    }

    case actionTypes.REMOVE_LEAD: {
      const { columnId, leadId } = action.payload as {
        columnId: number;
        leadId: number;
      };
      return state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            leads: column.leads.filter((lead) => lead.id !== leadId),
          };
        }
        return column;
      });
    }

    case actionTypes.ADD_TAG: {
      const { columnId, leadId, tag } = action.payload as {
        columnId: number;
        leadId: number;
        tag: { id: number; tag: Tag };
      };

      const updatedState = state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            leads: column.leads.map((lead) => {
              if (lead.id === leadId) {
                return {
                  ...lead,
                  leadTags: [...lead.leadTags, tag],
                };
              }
              return lead;
            }),
          };
        }
        return column;
      });
      return updatedState;
    }

    case actionTypes.REMOVE_TAG: {
      const { columnId, leadId, tagId } = action.payload as {
        columnId: number;
        leadId: number;
        tagId: number;
      };
      const updatedState = state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            leads: column.leads.map((lead) => {
              if (lead.id === leadId) {
                return {
                  ...lead,
                  leadTags: lead.leadTags.filter((tag) => tag.id !== tagId),
                };
              }
              return lead;
            }),
          };
        }
        return column;
      });
      return updatedState;
    }

    case actionTypes.ADD_SALES_USER: {
      const { columnId, leadId, user } = action.payload as {
        columnId: number;
        leadId: number;
        user: User;
      };
      const updatedState = state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            leads: column.leads.map((lead) => {
              if (lead.id === leadId) {
                return {
                  ...lead,
                  salesUser: user,
                  assignedSalesUserId: user.id,
                };
              }
              return lead;
            }),
          };
        }
        return column;
      });
      return updatedState;
    }

    case actionTypes.REMOVE_SALES_USER: {
      const { columnId, leadId } = action.payload as {
        columnId: number;
        leadId: number;
      };

      return state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            leads: column.leads.map((lead) => {
              if (lead.id === leadId) {
                return {
                  ...lead,
                  salesUser: null,
                  assignedSalesUserId: null,
                };
              }
              return lead;
            }),
          };
        }
        return column;
      });
    }

    case actionTypes.ADD_APPOINTMENT: {
      const { leadId, columnId, appointment } = action.payload as {
        leadId: number;
        columnId: number;
        appointment: Appointment;
      };
      return state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            leads: column.leads.map((lead) => {
              const appointmentDate = moment(appointment.date);
              const today = moment();
              const hasAppointment =
                moment(appointmentDate).isSameOrAfter(today);
              if (lead.id === leadId && hasAppointment) {
                return {
                  ...lead,
                  appointments: [
                    ...(lead.client?.appointments || []),
                    appointment,
                  ],
                };
              }
              return lead;
            }),
          };
        }
        return column;
      });
    }

    case actionTypes.CREATE_INVOICE: {
      const { columnId, leadId, isInvoiceCreated } = action.payload as {
        columnId: number;
        leadId: number;
        isInvoiceCreated: boolean;
      };
      return state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            leads: column.leads.map((lead) => {
              if (lead.id === leadId) {
                return {
                  ...lead,
                  isEstimateCreated: isInvoiceCreated,
                };
              }
              return lead;
            }),
          };
        }
        return column;
      });
    }

    case actionTypes.CREATE_LEAD_TASK: {
      const { task, leadId, columnId } = action.payload as {
        task: Task;
        leadId: number;
        columnId: number;
      };
      return state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            leads: column.leads.map((lead) => {
              if (lead.id === leadId) {
                return {
                  ...lead,
                  tasks: [...(lead.tasks || []), task],
                };
              }
              return lead;
            }),
          };
        }
        return column;
      });
    }

    case actionTypes.AUTOMATION_TRIGGER: {
      const { updatedLead, previousColumnId } = action.payload as {
        updatedLead: Lead;
        previousColumnId: number;
      };

      const findPrevLead = state
        .find((column) => column.id === previousColumnId)
        ?.leads.find((lead) => lead.id === updatedLead.id);

      const updatePrevLeadData = {
        ...findPrevLead,
        columnId: updatedLead.columnId,
      };

      // update the state with the new lead data

      const updatedState = state.map((column) => {
        if (column.id === previousColumnId) {
          return {
            ...column,
            leads: column.leads.filter((lead) => {
              return lead.id !== updatedLead.id;
            }),
          };
        }

        if (column.id === updatedLead.columnId) {
          return {
            ...column,
            leads: [updatePrevLeadData, ...column.leads],
          };
        }
        return column;
      });
      console.log("Updated State:", updatedState);
      return updatedState;
    }

    case actionTypes.RELOAD_STATE: {
      const state = action.payload ?? ([] as ColumnWithLeads[]);
      return state;
    }

    default:
      return state;
  }
}
