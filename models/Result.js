import mongoose from "mongoose";

const ResultSchema = new mongoose.Schema(
  {
    game: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    resultNumber: { type: String, default: "" },
    waitingGame: { type: String, default: "" }
  },
  { timestamps: true, collection: "results" }
);

ResultSchema.index({ game: 1, date: 1 }, { unique: true });

export default mongoose.models.Result || mongoose.model("Result", ResultSchema);
