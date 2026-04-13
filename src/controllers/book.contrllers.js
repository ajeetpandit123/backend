import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Book } from "../models/books.models.js";

export const getStoreStats = asyncHandler(async (req, res) => {
  try {
    console.log(getStoreStats);

    const result = await Book.aggregate([
      {
        $match: {
          authorId: 1,
        },
      },
      {
        $project: {
          price: 1,
          stock: 1,
          sold: 1,

          revenue: {
            $multiply: ["$price", "$sold"],
          },

          remainingStock: {
            $subtract: ["$stock", "$sold"],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$revenue" },
          totalRemainingStock: { $sum: "$remainingStock" },
        },
      },
    ]);

    console.log("📦 RAW RESULT:", result);

    // ✅ SAFE extraction
    const totalRevenue = result?.[0]?.totalRevenue || 0;
    const totalRemainingStock = result?.[0]?.totalRemainingStock || 0;

    console.log("💰 Total Revenue:", totalRevenue);
    console.log("📦 Remaining Stock:", totalRemainingStock);

    return res.status(200).json(
      new ApiResponse(
        200,
        { totalRevenue, totalRemainingStock },
        "Store stats fetched successfully"
      )
    );
  } catch (error) {
    console.log("❌ Error:", error);
    throw new apiError(500, "Error fetching stats");
  }
});