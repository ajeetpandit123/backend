import mongoose, { mongo } from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

// Video Schema
const videoSchema = new mongoose.Schema(
  {
    // Video title
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"]
    },

    // Video description
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true
    },

    // Video file URL (Cloudinary / AWS S3)
    videoUrl: {
      type: String,
      required: [true, "Video URL is required"]
    },

    // Thumbnail image URL
    thumbnail: {
      type: String,
      required: [true, "Thumbnail is required"]
    },

    // Duration in seconds
    duration: {
      type: Number,
      required: [true, "Video duration is required"]
    },

    // Owner (User who uploaded)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Views count
    views: {
      type: Number,
      default: 0
    },

    // Likes count
    likes: {
      type: Number,
      default: 0
    },

    // Dislikes count
    dislikes: {
      type: Number,
      default: 0
    },

    // Tags for search (SEO purpose)
    tags: [
      {
        type: String,
        trim: true
      }
    ],

    // Is video published or private
    isPublished: {
      type: Boolean,
      default: true
    }

  },
  {
    timestamps: true // adds createdAt & updatedAt automatically
  }
)


mongoose.plugin(mongooseAggregatePaginate)



// Export model
export const Video = mongoose.model("Video", videoSchema)