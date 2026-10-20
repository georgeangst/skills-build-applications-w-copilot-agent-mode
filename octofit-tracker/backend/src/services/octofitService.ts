import { Activity, Team, User, Workout } from '../models/index.js';
import { Types } from 'mongoose';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const invalidInput = () => Object.assign(new Error('Invalid activity input'), { status: 400 });
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw invalidInput();

  const body = input as Record<string, unknown>;
  const { userId, teamId, type, minutes } = body;
  if (
    typeof userId !== 'string' ||
    !Types.ObjectId.isValid(userId) ||
    typeof teamId !== 'string' ||
    !Types.ObjectId.isValid(teamId) ||
    typeof type !== 'string' ||
    !type.trim() ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw invalidInput();
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team || user.team?.toString() !== team._id.toString()) {
    throw Object.assign(new Error('Activity user and team must exist and be related'), { status: 400 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const invalidInput = () => Object.assign(new Error('Invalid team input'), { status: 400 });
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw invalidInput();

  const body = input as Record<string, unknown>;
  const { name, mascot, members = [] } = body;
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof mascot !== 'string' ||
    !mascot.trim() ||
    !Array.isArray(members) ||
    !members.every((member): member is string => typeof member === 'string' && Types.ObjectId.isValid(member))
  ) {
    throw invalidInput();
  }

  const memberIds = [...new Set(members)];
  const users = await User.find({ _id: { $in: memberIds } }).select('_id team');
  if (users.length !== memberIds.length) {
    throw Object.assign(new Error('Team members must exist'), { status: 400 });
  }

  const team = await Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
  const previousTeamIds = users.flatMap((user) => user.team ? [user.team] : []);
  if (previousTeamIds.length) {
    await Team.updateMany(
      { _id: { $in: previousTeamIds, $ne: team._id } },
      { $pull: { members: { $in: memberIds } } },
    );
  }
  if (memberIds.length) {
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);
  const teams = await Team.find({ _id: { $in: totals.map(({ _id }) => _id) } }).select('name').lean();
  const teamNames = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return totals.flatMap(({ _id, totalPoints }, index) => {
    const teamName = teamNames.get(_id.toString());
    return teamName === undefined ? [] : [{ teamName, totalPoints, rank: index + 1 }];
  });
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).select('_id fitnessGoal');
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const [activities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).select('type').lean(),
    Workout.find().lean(),
  ]);
  const recentTypes = [...new Set(activities.map(({ type }) => type))];
  const reason = recentTypes.length
    ? `Recommended for your ${user.fitnessGoal} goal and recent ${recentTypes.join(', ')} activity.`
    : `Recommended for your ${user.fitnessGoal} fitness goal.`;

  return workouts
    .sort((left, right) => Number(right.focus === user.fitnessGoal) - Number(left.focus === user.fitnessGoal))
    .map((workout) => ({ ...workout, reason }));
}

export { User };
