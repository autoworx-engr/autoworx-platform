import { assignTask } from "@/actions/task/assignTask";
import FormError from "@/components/FormError";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { errorToast, successToast } from "@/lib/toast";
import { usePopupStore } from "@/stores/popup";
import { Task, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useInView } from "framer-motion";
import { ListCheck, Loader2, UserCog } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import EmptyMsg from "../../../../../../components/common/EmptyMsg";
import { taskQueryKey } from "../../_constant";
import useInfinityTaskQuery from "../../_hook/task/query/useInfinityTask";
import TaskError from "../ui/TaskError";
import TaskSpinner from "../ui/TaskSpinner";

export default function AssignTask() {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(sentinelRef, {
    root: scrollContainerRef,
    margin: "0px 0px 120px 0px",
    amount: 0.1,
  });

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinityTaskQuery();

  const tasks = data?.pages?.flatMap((page) => page.data) ?? [];

  const queryClient = useQueryClient();
  const { popup, data: popupData, close } = usePopupStore();
  // close() nulls the store data, so read defensively — the dialog can still
  // render a frame while Radix plays its close animation.
  const user = popupData?.user as User | undefined;
  const assignedUserTasks = (popupData?.userTasks as Task[]) ?? [];

  const [taskDataInput, setTaskDataInput] = useState<
    { taskId: number; assigned: boolean }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add only newly loaded tasks to the input state without resetting existing ones
  useEffect(() => {
    setTaskDataInput((prev) => {
      const existingIds = new Set(prev.map((t) => t.taskId));
      const newEntries = tasks
        .filter((task) => !existingIds.has(task.id))
        .map((task) => ({
          taskId: task.id,
          assigned: assignedUserTasks.some((ut) => ut.id === task.id),
        }));
      return newEntries.length ? [...prev, ...newEntries] : prev;
    });
  }, [tasks]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage]);

  async function handleSubmit() {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const result = await assignTask({
        userId: user.id,
        tasksToAssign: taskDataInput,
      });

      if (result.type !== "success") {
        errorToast("Failed to assign tasks. Please try again.");
        return;
      }

      queryClient.invalidateQueries({
        queryKey: taskQueryKey.taskByUserId(user.id.toString()),
      });
      queryClient.invalidateQueries({ queryKey: [taskQueryKey.allTasks] });
      queryClient.invalidateQueries({ queryKey: taskQueryKey.allTaskByScroll });

      successToast("Tasks assigned successfully.");
      close();
    } catch {
      errorToast("Failed to assign tasks. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const toggleTask = (taskId: number, assigned: boolean) => {
    setTaskDataInput((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, assigned } : t)),
    );
  };

  let content = null;
  if (isLoading && !isError) {
    content = <TaskSpinner />;
  } else if (!isLoading && isError) {
    content = <TaskError message="Fail to load tasks" />;
  } else if (!isLoading && !isError && tasks.length === 0) {
    content = <EmptyMsg message="No Tasks found" />;
  } else if (!isLoading && !isError && tasks.length > 0) {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    content = taskDataInput.map((task) => {
      const taskInfo = taskMap.get(task.taskId);
      if (!taskInfo) return null;
      const inputId = `assign-task-${task.taskId}`;
      return (
        <Label
          key={task.taskId}
          htmlFor={inputId}
          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-normal ring-1 ring-transparent transition-colors hover:bg-accent hover:ring-border data-[checked=true]:bg-accent"
          data-checked={task.assigned}
        >
          <Checkbox
            id={inputId}
            checked={task.assigned}
            onCheckedChange={(checked) =>
              toggleTask(task.taskId, checked === true)
            }
          />
          <span className="font-medium text-foreground">{taskInfo.title}</span>
        </Label>
      );
    });
  }

  return (
    <Dialog open={popup === "ASSIGN_TASK"} onOpenChange={close}>
      <DialogContent className="w-[36rem] max-w-[92vw] rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <UserCog className="h-5 w-5 text-primary" />
            </span>
            Assign Tasks to User
          </DialogTitle>
        </DialogHeader>

        <Separator className="my-2" />

        <FormError />

        {/* User card */}
        {user && (
          <div className="flex items-center gap-3 rounded-full border bg-muted/40 p-3 w-fit">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={user.image ?? undefined}
                alt={`${user.firstName} ${user.lastName}`}
              />
              <AvatarFallback>
                {(user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-base font-bold text-foreground">
                {user.firstName} {user.lastName}
              </p>
              {user.email && (
                <p className="truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Task selection */}
        <div className="mb-2 mt-6 flex items-center gap-2">
          <ListCheck className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            Select Tasks
          </h3>
        </div>

        <div
          ref={scrollContainerRef}
          className="thin-scrollbar flex max-h-[15rem] flex-col gap-1 overflow-y-auto rounded-xl border bg-muted/20 p-2"
        >
          {content}
          <div
            ref={sentinelRef}
            className="flex justify-center gap-2 py-1 text-sm text-muted-foreground"
          >
            {isFetchingNextPage && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                loading more...
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="mt-6 gap-3">
          <Button variant="outline" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
