import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: function() {
                return !this.isGlobal; // Only required if not a global notification
            },
        },
        type: {
            type: String,
            enum: ['MISSING_PERSON', 'SIGHTING_REPORT', 'MATCH_FOUND', 'STATUS_UPDATE', 'SYSTEM'],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        relatedId: {
            type: mongoose.Schema.ObjectId,
            refPath: 'relatedModel',
        },
        relatedModel: {
            type: String,
            enum: ['MissingPerson', 'SightingReport', 'User'],
        },
        image: {
            type: String,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        isGlobal: {
            type: Boolean,
            default: false,
        },
        requiresConfirmation: {
            type: Boolean,
            default: false,
        },
        confirmed: {
            type: Boolean,
            default: false,
        },
        matchData: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    { timestamps: true }
);

// Index for faster queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ isGlobal: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
