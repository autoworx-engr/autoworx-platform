"use client";
import { getEmployees } from "@/actions/employee/get";
import { sendNotification } from "@/actions/notification/sendNotification";
import { User } from "@prisma/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function Page() {
  const [employees, setEmployees] = useState<User[] | null>(null);

  useEffect(() => {
    getEmployees({}).then(setEmployees);
  }, []);

  const handleSubmit = async (data: FormData) => {
    const title = (data.get("title") as string).trim();
    const description = (data.get("description") as string).trim();
    const userId = Number(data.get("userId"));

    if (!title || !description) return;
    if (!userId || isNaN(userId) || userId <= 0) return;

    try {
      await sendNotification({ userId, title, description });
      toast.success("Notification sent successfully.");
    } catch (error) {
      toast.error("Failed to send notification. Please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-lg">
      <h2 className="mb-6 text-center text-2xl font-semibold">
        Send Notification
      </h2>
      <form action={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="title"
          placeholder="Title"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          name="description"
          placeholder="Description"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
        <select
          name="userId"
          required
          disabled={!employees}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {!employees ? (
            <option>Loading...</option>
          ) : (
            employees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))
          )}
        </select>
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Send Notification
        </button>
      </form>
    </div>
  );
}
