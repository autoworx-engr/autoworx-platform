-- CreateTable: per-user, per-group "last seen" pointer for unread counts
CREATE TABLE "group_read_states" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_read_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_read_states_user_id_group_id_key"
    ON "group_read_states"("user_id", "group_id");
CREATE INDEX "group_read_states_user_id_idx" ON "group_read_states"("user_id");
CREATE INDEX "group_read_states_group_id_idx" ON "group_read_states"("group_id");

-- AddForeignKey
ALTER TABLE "group_read_states"
    ADD CONSTRAINT "group_read_states_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "group_read_states"
    ADD CONSTRAINT "group_read_states_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
