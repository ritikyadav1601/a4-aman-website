import mongoose from "mongoose";

const AdSchema = new mongoose.Schema(
  {
    sqlId: { type: Number, index: true, unique: true, sparse: true },
    gpayNumber: { type: String, default: "" },
    whatsappNumber: { type: String, default: "" },
    khaiwalName: { type: String, default: "" },
    website: { type: String, default: "" }
  },
  { timestamps: true, collection: "advertisements" }
);

export default mongoose.models.Ad || mongoose.model("Ad", AdSchema);