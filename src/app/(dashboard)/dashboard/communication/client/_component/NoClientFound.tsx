import Link from "next/link";

export default function NoClientFound() {
    return (
        <div className="mt-24 flex flex-col items-center justify-center text-xl capitalize">
          <div>No clients found</div>
          <div>
            Please{" "}
            <Link
              className="text-violet-600 underline"
              href="/communication/dashboard/client"
            >
              add a client
            </Link>{" "}
            to your company
          </div>
        </div>
    )
}