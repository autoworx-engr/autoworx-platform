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
        leads: any[];
      };
      return state.map((column) => {
        if (column.id === columnId) {
          const existingLeadIds = new Set(column.leads.map((lead) => lead.id));
          const newLeads = leads.filter(
            (lead) => !existingLeadIds.has(lead.id),
          );
          const updatedLeads = [...column.leads, ...newLeads];
          return {
            ...column,
            leads: updatedLeads,
          };
        }
        return column;
      });
    }

    case actionTypes.MERGE_BACKGROUND_LEADS: {
      const { columnId, leads } = action.payload as {
        columnId: number;
        leads: any[];
      };
      return state.map((column) => {
        if (column.id === columnId) {
          // Remove duplicates by filtering out leads that already exist
          const existingLeadIds = new Set(column.leads.map((lead) => lead.id));
          const newLeads = leads.filter(
            (lead: any) => !existingLeadIds.has(lead.id),
          );

          const updatedLeads = [...column.leads, ...newLeads];
          return {
            ...column,
            leads: updatedLeads,
            hasMoreLeads: false, // Mark as all leads loaded
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

      // Find the lead to drag
      const findDraggableLead = sourceColumn.leads.find(
        (lead) => lead.id.toString() === draggableId,
      );

      if (!findDraggableLead) {
        return state; // If the lead is not found, do nothing
      }

      // Check if dragging within the same column
      const isSameColumn = sourceColumnIndex === destinationColumnIndex;

      if (isSameColumn) {
        // Handle same column reordering
        const updatedLeads = sourceColumn.leads.filter(
          (lead) => lead.id.toString() !== draggableId,
        );

        // Calculate new position based on old and new indices
        let newIndex = destination.index;
        if (source.index < destination.index) {
          newIndex = destination.index - 1;
        }

        // Ensure newIndex is within bounds
        newIndex = Math.max(0, Math.min(newIndex, updatedLeads.length));

        // Insert at new position
        updatedLeads.splice(newIndex, 0, findDraggableLead);

        // Return new state with updated column
        return state.map((column) => {
          if (column.id === sourceColumn.id) {
            return {
              ...column,
              leads: updatedLeads,
            };
          }
          return column;
        });
      } else {
        // Remove the lead from the source column
        const updatedSourceLeads = sourceColumn.leads.filter(
          (lead) => lead.id.toString() !== draggableId,
        );

        // Create the new list for destination column
        const updatedDestinationLeads = [...destinationColumn.leads];

        // Insert at destination index
        let insertIndex = destination.index;
        insertIndex = Math.max(
          0,
          Math.min(insertIndex, updatedDestinationLeads.length),
        );

        // Insert the lead at the correct position
        updatedDestinationLeads.splice(insertIndex, 0, {
          ...findDraggableLead,
          columnId: destinationColumn.id,
        });

        const updatedDestinationColumn = {
          ...destinationColumn,
          leads: updatedDestinationLeads,
          totalLeads: destinationColumn.totalLeads + 1,
        };

        const updatedSourceColumn = {
          ...sourceColumn,
          leads: updatedSourceLeads,
          totalLeads: sourceColumn.totalLeads - 1,
        };

        return state.map((column) => {
          if (column.id === sourceColumn.id) {
            return updatedSourceColumn;
          }
          if (column.id === destinationColumn.id) {
            return updatedDestinationColumn;
          }
          return column;
        });
      }
    }

    case actionTypes.REMOVE_LEAD: {
      const { columnId, leadId } = action.payload as {
        columnId: number;
        leadId: number;
      };
      return state.map((column) => {
        if (column.id === columnId) {
          const updatedLeads = column.leads.filter(
            (lead) => lead.id !== leadId,
          );
          return {
            ...column,
            leads: updatedLeads,
            totalLeads: column.totalLeads - 1,
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
      const updatedColumn = state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            leads: column.leads.map((lead) => {
              const appointmentDate = moment(appointment.date).format(
                "YYYY-MM-DD",
              );
              const appointmentEndTime = moment(
                `${appointmentDate}T${appointment.endTime}:00.000`,
              );
              const today = moment();
              const hasAppointment =
                moment(appointmentEndTime).isSameOrAfter(today);
              if (lead.id === leadId && hasAppointment) {
                return {
                  ...lead,
                  client: {
                    ...lead.client,
                    appointments: [
                      ...(lead.client?.appointments || []),
                      appointment,
                    ],
                  },
                };
              }
              return lead;
            }),
          };
        }
        return column;
      });
      return updatedColumn;
    }

    case actionTypes.CREATE_INVOICE: {
      const { columnId, leadId, isInvoiceCreated, invoiceId } =
        action.payload as {
          columnId: number;
          leadId: number;
          isInvoiceCreated: boolean;
          invoiceId?: string | null;
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
                  invoiceId: invoiceId ?? lead.invoiceId ?? null,
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
      const { task, leadId, columnId, isUpdate } = action.payload as {
        task: Task;
        leadId: number;
        columnId: number;
        isUpdate?: boolean;
      };
      return state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            leads: column.leads.map((lead) => {
              if (lead.id === leadId) {
                if (isUpdate) {
                  // Update existing task
                  return {
                    ...lead,
                    tasks: (lead.tasks || []).map((existingTask) =>
                      existingTask.id === task.id ? task : existingTask,
                    ),
                  };
                } else {
                  // Create new task
                  return {
                    ...lead,
                    tasks: [...(lead.tasks || []), task],
                  };
                }
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

      // If the lead is staying in the same column, don't move it
      if (updatedLead?.columnId === previousColumnId) {
        return state.map((column) => {
          if (column.id === previousColumnId) {
            return {
              ...column,
              leads: column.leads.map((lead) => {
                if (lead?.id === updatedLead?.id) {
                  return {
                    ...lead,
                    columnId: updatedLead?.columnId,
                  };
                }
                return lead;
              }),
            };
          }
          return column;
        });
      }

      const columnIdsInState = new Set(state.map((c) => c.id));
      if (
        !columnIdsInState.has(previousColumnId) ||
        !columnIdsInState.has(updatedLead?.columnId)
      ) {
        return state;
      }

      const findPrevLead = state
        .find((column) => column?.id === previousColumnId)
        ?.leads.find((lead) => lead?.id === updatedLead?.id);

      const updatePrevLeadData = findPrevLead
        ? {
            ...findPrevLead,
            columnId: updatedLead?.columnId,
          }
        : null;

      // update the state with the new lead data

      const updatedState = state.map((column) => {
        if (column.id === previousColumnId) {
          return {
            ...column,
            leads: column.leads.filter((lead) => {
              return lead?.id !== updatedLead?.id;
            }),
            totalLeads: (column.totalLeads || 0) - 1,
          };
        }

        if (column.id === updatedLead?.columnId) {
          return {
            ...column,
            leads: updatePrevLeadData
              ? [updatePrevLeadData, ...column.leads]
              : column.leads,
            totalLeads: (column.totalLeads || 0) + 1,
          };
        }
        return column;
      });

      return updatedState;
    }

    case actionTypes.INCREASE_LEAD_COUNT: {
      const { columnId } = action.payload as { columnId: number };
      return state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            totalLeads: (column.totalLeads || 0) + 1,
          };
        }
        return column;
      });
    }

    case actionTypes.DECREASE_LEAD_COUNT: {
      const { columnId } = action.payload as { columnId: number };
      return state.map((column) => {
        if (column.id === columnId) {
          return {
            ...column,
            totalLeads: (column.totalLeads || 0) - 1,
          };
        }
        return column;
      });
    }

    case actionTypes.RELOAD_STATE: {
      const state = action.payload ?? ([] as ColumnWithLeads[]);
      return state;
    }

    default: {
      return state;
    }
  }
}
