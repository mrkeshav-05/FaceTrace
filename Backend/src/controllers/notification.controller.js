import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import MissingPerson from '../models/findMissing.model.js';
import SightingReport from '../models/reportMissing.model.js';
import ApiResponse from '../utils/apiResponse.js';
import { sendNotificationToUser, sendGlobalNotification } from '../socket/socket.js';
import mongoose from 'mongoose';

// Get all notifications for the authenticated user
export const getUserNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Find notifications for the user or global notifications
        const notifications = await Notification.find({
            $or: [
                { recipient: req.user.id },
                { isGlobal: true }
            ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('relatedId', 'name photos');

        // Get total count for pagination
        const total = await Notification.countDocuments({
            $or: [
                { recipient: req.user.id },
                { isGlobal: true }
            ]
        });

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'Notifications retrieved successfully',
            data: {
                notifications,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error'
        });
    }
};

// Mark notifications as read
export const markNotificationsAsRead = async (req, res) => {
    try {
        const { notificationIds } = req.body;

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Invalid notification IDs'
            });
        }

        // Update notifications
        await Notification.updateMany(
            {
                _id: { $in: notificationIds },
                $or: [
                    { recipient: req.user.id },
                    { isGlobal: true }
                ]
            },
            { isRead: true }
        );

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'Notifications marked as read'
        });
    } catch (error) {
        console.error('Mark notifications error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error'
        });
    }
};

// Create a notification for a specific user
export const createNotification = async (recipientId, type, title, message, relatedId = null, relatedModel = null, image = null) => {
    try {
        const notification = await Notification.create({
            recipient: recipientId,
            type,
            title,
            message,
            relatedId,
            relatedModel,
            image,
            isGlobal: false
        });

        // Populate related data for real-time notification
        const populatedNotification = await Notification.findById(notification._id)
            .populate('relatedId', 'name photos');

        // Send real-time notification if socket.io is available
        if (global.io) {
            sendNotificationToUser(global.io, recipientId, populatedNotification);
        }

        return notification;
    } catch (error) {
        console.error('Create notification error:', error);
        return null;
    }
};

// Create a global notification
export const createGlobalNotification = async (type, title, message, relatedId = null, relatedModel = null, image = null) => {
    try {
        const notification = await Notification.create({
            type,
            title,
            message,
            relatedId,
            relatedModel,
            image,
            isGlobal: true
        });

        // Populate related data for real-time notification
        const populatedNotification = await Notification.findById(notification._id)
            .populate('relatedId', 'name photos');

        // Send real-time notification if socket.io is available
        if (global.io) {
            sendGlobalNotification(global.io, populatedNotification);
        }

        return notification;
    } catch (error) {
        console.error('Create global notification error:', error);
        return null;
    }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: id,
            recipient: req.user.id
        });

        if (!notification) {
            return ApiResponse.error(res, {
                statusCode: 404,
                message: 'Notification not found or not authorized to delete'
            });
        }

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error'
        });
    }
};

// Get unread notification count
export const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            $or: [
                { recipient: req.user.id },
                { isGlobal: true }
            ],
            isRead: false
        });

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'Unread count retrieved successfully',
            data: { count }
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error'
        });
    }
};

// Send match alert
// Confirm a match notification
export const confirmMatch = async (req, res) => {
    try {
        const { notificationId, confirm } = req.body;

        if (!notificationId) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Notification ID is required'
            });
        }

        // Find the notification
        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: req.user.id,
            type: 'MATCH_FOUND',
            requiresConfirmation: true
        });

        if (!notification) {
            return ApiResponse.error(res, {
                statusCode: 404,
                message: 'Notification not found or not authorized'
            });
        }

        // Update notification status
        notification.confirmed = confirm === true;
        notification.isRead = true;
        await notification.save();

        // If confirmed, update both listings' status and send notifications
        if (confirm === true && notification.matchData) {
            const { missingPersonId, matchId, alertSentBy } = notification.matchData;

            // First, update the missing person status (recipient's listing)
            if (missingPersonId) {
                // console.log('Updating missing person with ID:', missingPersonId);

                try {
                    // Ensure we're using a valid ObjectId string
                    const missingPersonObjectId = mongoose.Types.ObjectId.isValid(missingPersonId)
                        ? missingPersonId
                        : null;

                    if (!missingPersonObjectId) {
                        console.error('Invalid missingPersonId:', missingPersonId);
                        throw new Error('Invalid missing person ID format');
                    }

                    // Update missing person status to 'found'
                    const missingPerson = await MissingPerson.findByIdAndUpdate(
                        missingPersonObjectId,
                        { status: 'found' },
                        { new: true }
                    ).populate('reportedBy', '_id');

                    if (missingPerson && missingPerson.reportedBy) {
                        // Send notification to the person who reported the missing person
                        await createNotification(
                            missingPerson.reportedBy._id,
                            'STATUS_UPDATE',
                            'Missing Person Found',
                            `${missingPerson.name} has been confirmed as found.`,
                            missingPerson._id,
                            'MissingPerson',
                            missingPerson.photos[0]
                        );

                        // Send notification to the user who sent the alert (if available)
                        if (alertSentBy && alertSentBy !== missingPerson.reportedBy._id.toString()) {
                            await createNotification(
                                alertSentBy,
                                'STATUS_UPDATE',
                                'Match Confirmed',
                                `Your match for ${missingPerson.name} has been confirmed.`,
                                missingPerson._id,
                                'MissingPerson',
                                missingPerson.photos[0]
                            );
                        }

                        // Send global notification
                        await createGlobalNotification(
                            'STATUS_UPDATE',
                            'Missing Person Found',
                            `${missingPerson.name}, previously reported missing, has been found.`,
                            missingPerson._id,
                            'MissingPerson',
                            missingPerson.photos[0]
                        );
                    }
                } catch (error) {
                    console.error('Error updating missing person status:', error);
                    // Continue execution even if updating the missing person fails
                }
            }

            // Now, update the sender's listing (either a missing person or sighting report)
            if (matchId) {
                // console.log('Updating sender\'s listing with ID:', matchId);

                try {
                    // First, check if it's a missing person
                    if (mongoose.Types.ObjectId.isValid(matchId)) {
                        const matchingMissingPerson = await MissingPerson.findById(matchId);

                        if (matchingMissingPerson) {
                            // Update the matching missing person status to 'found'
                            const updatedMatchingPerson = await MissingPerson.findByIdAndUpdate(
                                matchId,
                                { status: 'found' },
                                { new: true }
                            ).populate('reportedBy', '_id');

                            if (updatedMatchingPerson && updatedMatchingPerson.reportedBy) {
                                // Send notification to the person who reported this missing person
                                await createNotification(
                                    updatedMatchingPerson.reportedBy._id,
                                    'STATUS_UPDATE',
                                    'Missing Person Found',
                                    `${updatedMatchingPerson.name} has been confirmed as found.`,
                                    updatedMatchingPerson._id,
                                    'MissingPerson',
                                    updatedMatchingPerson.photos[0]
                                );
                            }

                            // console.log('Updated matching missing person status to found');
                        } else {
                            // It might be a sighting report
                            const matchingSightingReport = await SightingReport.findById(matchId);

                            if (matchingSightingReport) {
                                // Update the sighting report status to 'verified'
                                const updatedSightingReport = await SightingReport.findByIdAndUpdate(
                                    matchId,
                                    { status: 'verified' },
                                    { new: true }
                                ).populate('reportedBy', '_id');

                                if (updatedSightingReport && updatedSightingReport.reportedBy) {
                                    // Send notification to the person who reported this sighting
                                    await createNotification(
                                        updatedSightingReport.reportedBy._id,
                                        'STATUS_UPDATE',
                                        'Sighting Report Verified',
                                        `Your sighting report at ${updatedSightingReport.location} has been verified.`,
                                        updatedSightingReport._id,
                                        'SightingReport',
                                        updatedSightingReport.photos[0]
                                    );
                                }

                                // console.log('Updated matching sighting report status to verified');
                            } else {
                                // console.log('No matching document found for matchId:', matchId);
                            }
                        }
                    } else {
                        console.error('Invalid matchId format:', matchId);
                    }
                } catch (error) {
                    console.error('Error updating sender\'s listing status:', error);
                    // Continue execution even if updating the sender's listing fails
                }
            }
        } else if (confirm === false && notification.matchData) {
            // If rejected, send notification to the user who sent the alert
            const { alertSentBy, missingPersonId } = notification.matchData;

            if (alertSentBy) {
                try {
                    // Get missing person details for the notification
                    let missingPersonName = "the person";
                    let missingPersonPhoto = null;

                    if (missingPersonId) {
                        const missingPerson = await MissingPerson.findById(missingPersonId);
                        if (missingPerson) {
                            missingPersonName = missingPerson.name;
                            missingPersonPhoto = missingPerson.photos && missingPerson.photos.length > 0
                                ? missingPerson.photos[0]
                                : null;
                        }
                    }

                    // Send notification to the user who sent the alert
                    await createNotification(
                        alertSentBy,
                        'STATUS_UPDATE',
                        'Match Rejected',
                        `Your match for ${missingPersonName} was not confirmed.`,
                        missingPersonId,
                        'MissingPerson',
                        missingPersonPhoto
                    );
                } catch (error) {
                    console.error('Error sending rejection notification:', error);
                    // Continue execution even if sending notification fails
                }
            }
        }

        return ApiResponse.success(res, {
            statusCode: 200,
            message: confirm ? 'Match confirmed successfully' : 'Match rejected',
            data: { confirmed: confirm }
        });
    } catch (error) {
        console.error('Confirm match error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message
        });
    }
};

export const sendMatchAlert = async (req, res) => {
    try {
        const { missingPersonId, matchId, source } = req.body;
        const currentUserId = req.user.id; // Get the current user's ID

        // console.log('sendMatchAlert called with:', {
        //     missingPersonId,
        //     matchId,
        //     source,
        //     currentUserId
        // });

        if (!missingPersonId || !matchId) {
            // console.log('Missing required parameters:', { missingPersonId, matchId });
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Missing person ID and match ID are required'
            });
        }

        // We no longer need to swap parameters since the frontend now sends them consistently
        // missingPersonId is always the missing person ID
        // matchId is always the sighting report ID or another missing person ID
        let actualMissingPersonId = missingPersonId;
        let actualMatchId = matchId;

        // console.log('Using parameters:', { actualMissingPersonId, actualMatchId, source });

        // Add additional logging for debugging
        // console.log('Current user ID:', currentUserId);

        // Determine if this is a missing person to sighting report match or vice versa
        let missingPerson, sightingReport, recipientId, relatedModel, relatedId;

        // Try to find both as missing persons first
        const missingPersonDoc = await MissingPerson.findById(actualMissingPersonId);
        const matchAsMissingPerson = await MissingPerson.findById(actualMatchId);

        // console.log('Document lookup results:', {
        //     missingPersonDoc: missingPersonDoc ? 'found' : 'not found',
        //     matchAsMissingPerson: matchAsMissingPerson ? 'found' : 'not found'
        // });

        if (missingPersonDoc && matchAsMissingPerson) {
            // Both are missing persons, send alert to the person who listed the matching missing person
            missingPerson = missingPersonDoc;
            recipientId = matchAsMissingPerson.reportedBy;
            relatedModel = 'MissingPerson';
            relatedId = actualMissingPersonId;

            // console.log('Both are missing persons:', {
            //     recipientId: recipientId ? recipientId.toString() : 'null',
            //     currentUserId
            // });

            // Don't send alert if the recipient is the same as the current user
            if (recipientId && recipientId.toString() === currentUserId) {
                // console.log('Cannot send alert to own listing (both missing persons)');
                return ApiResponse.error(res, {
                    statusCode: 400,
                    message: 'Cannot send alert to your own listing'
                });
            }
        } else {
            // Check if one is a missing person and one is a sighting report
            const sightingReportDoc = await SightingReport.findById(actualMatchId);

            // console.log('Sighting report lookup:', {
            //     sightingReportDoc: sightingReportDoc ? 'found' : 'not found'
            // });

            if (missingPersonDoc && sightingReportDoc) {
                // Missing person to sighting report match
                missingPerson = missingPersonDoc;
                sightingReport = sightingReportDoc;

                if (source === 'missing') {
                    // If we're on the missing/[id] page, the recipient should be the user who created the sighting report
                    recipientId = sightingReport.reportedBy;
                    relatedModel = 'SightingReport';
                    relatedId = actualMatchId;
                } else {
                    // If we're on the report/[id] page, the recipient should be the user who created the missing person
                    recipientId = missingPerson.reportedBy;
                    relatedModel = 'MissingPerson';
                    relatedId = actualMissingPersonId;
                }

                // console.log('Missing person to sighting report match:', {
                //     recipientId: recipientId ? recipientId.toString() : 'null',
                //     currentUserId,
                //     missingPersonReportedBy: missingPerson.reportedBy ? missingPerson.reportedBy.toString() : 'null',
                //     sightingReportReportedBy: sightingReport.reportedBy ? sightingReport.reportedBy.toString() : 'null'
                // });

                // Check ownership based on the source page
                if (source === 'missing') {
                    // In the missing/[id] page, we need to check if the current user owns the sighting report
                    if (sightingReport.reportedBy && sightingReport.reportedBy.toString() === currentUserId) {
                        // console.log('Cannot send alert to own sighting report (missing/[id] page)');
                        return ApiResponse.error(res, {
                            statusCode: 400,
                            message: 'Cannot send alert to your own sighting report'
                        });
                    }
                } else {
                    // In the report/[id] page, we need to check if the current user owns the missing person
                    if (missingPerson.reportedBy && missingPerson.reportedBy.toString() === currentUserId) {
                        // console.log('Cannot send alert to own missing person (report/[id] page)');
                        return ApiResponse.error(res, {
                            statusCode: 400,
                            message: 'Cannot send alert to your own missing person listing'
                        });
                    }
                }
            } else {
                // Try the reverse
                const missingPersonAsMatch = await MissingPerson.findById(actualMatchId);
                const sightingReportAsSource = await SightingReport.findById(actualMissingPersonId);

                // console.log('Reverse lookup results:', {
                //     missingPersonAsMatch: missingPersonAsMatch ? 'found' : 'not found',
                //     sightingReportAsSource: sightingReportAsSource ? 'found' : 'not found'
                // });

                if (missingPersonAsMatch && sightingReportAsSource) {
                    // Sighting report to missing person match
                    missingPerson = missingPersonAsMatch;
                    sightingReport = sightingReportAsSource;
                    recipientId = missingPerson.reportedBy;
                    relatedModel = 'SightingReport';
                    relatedId = actualMissingPersonId;

                    // console.log('Sighting report to missing person match:', {
                    //     recipientId: recipientId ? recipientId.toString() : 'null',
                    //     currentUserId
                    // });

                    // Check ownership based on the source page
                    if (source === 'missing') {
                        // In the missing/[id] page, we need to check if the current user owns the missing person
                        if (missingPerson.reportedBy && missingPerson.reportedBy.toString() === currentUserId) {
                            // console.log('Cannot send alert to own missing person (missing/[id] page, reverse case)');
                            return ApiResponse.error(res, {
                                statusCode: 400,
                                message: 'Cannot send alert to your own missing person listing'
                            });
                        }
                    } else {
                        // In the report/[id] page, we need to check if the current user owns the sighting report
                        if (sightingReport.reportedBy && sightingReport.reportedBy.toString() === currentUserId) {
                            // console.log('Cannot send alert to own sighting report (report/[id] page, reverse case)');
                            return ApiResponse.error(res, {
                                statusCode: 400,
                                message: 'Cannot send alert to your own sighting report'
                            });
                        }
                    }
                } else {
                    // console.log('No matching documents found');
                    return ApiResponse.error(res, {
                        statusCode: 404,
                        message: 'Missing person or sighting report not found'
                    });
                }
            }
        }

        if (!recipientId) {
            // console.log('No recipient found');
            return ApiResponse.error(res, {
                statusCode: 404,
                message: 'Recipient not found'
            });
        }

        // Create notification
        const title = 'Potential Match Found';
        const message = missingPerson
            ? `A potential match has been found for ${missingPerson.name}.`
            : 'A potential match has been found for your report.';

        const image = missingPerson && missingPerson.photos && missingPerson.photos.length > 0
            ? missingPerson.photos[0]
            : null;

        // console.log('Creating notification with:', {
        //     recipientId: recipientId.toString(),
        //     title,
        //     message,
        //     relatedId: relatedId ? relatedId.toString() : 'null',
        //     relatedModel
        // });

        // Store match data for later use in confirmation
        // Convert ObjectIds to strings to avoid casting issues
        const matchData = {
            missingPersonId: missingPerson ? missingPerson._id.toString() : null,
            sightingReportId: sightingReport ? sightingReport._id.toString() : null,
            matchId: actualMatchId.toString(),
            sourceId: actualMissingPersonId.toString(),
            alertSentBy: currentUserId, // Store who sent the alert for later notification
            source: source || 'report' // Store the source page for reference
        };

        // console.log('Match data:', matchData);

        try {
            // Create notification with requiresConfirmation flag
            const notification = await Notification.create({
                recipient: recipientId,
                type: 'MATCH_FOUND',
                title,
                message,
                relatedId,
                relatedModel,
                image,
                isGlobal: false,
                requiresConfirmation: true,
                matchData
            });

            // console.log('Notification created:', notification._id.toString());

            // Populate related data for real-time notification
            const populatedNotification = await Notification.findById(notification._id)
                .populate('relatedId', 'name photos');

            // Send real-time notification if socket.io is available
            if (global.io) {
                // console.log('Sending real-time notification');
                sendNotificationToUser(global.io, recipientId, populatedNotification);
            } else {
                // console.log('Socket.io not available, skipping real-time notification');
            }

            if (!notification) {
                // console.log('Failed to create notification');
                return ApiResponse.error(res, {
                    statusCode: 500,
                    message: 'Failed to create notification'
                });
            }

            // console.log('Sending success response');
            return ApiResponse.success(res, {
                statusCode: 201,
                message: 'Match alert sent successfully'
            });
        } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
            return ApiResponse.error(res, {
                statusCode: 500,
                message: 'Failed to create notification',
                error: notificationError.message
            });
        }
    } catch (error) {
        console.error('Send match alert error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message
        });
    }
};
