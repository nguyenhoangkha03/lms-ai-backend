export enum RecommendationType {
  NEXT_LESSON = 'next_lesson',
  REVIEW_CONTENT = 'review_content',
  PRACTICE_QUIZ = 'practice_quiz',
  SUPPLEMENTARY_MATERIAL = 'supplementary_material',
  COURSE_RECOMMENDATION = 'course_recommendation',
  STUDY_SCHEDULE = 'study_schedule',
  LEARNING_PATH = 'learning_path',
  SKILL_IMPROVEMENT = 'skill_improvement',
  PEER_STUDY_GROUP = 'peer_study_group',
  TUTOR_SESSION = 'tutor_session',
  BREAK_SUGGESTION = 'break_suggestion',
  DIFFICULTY_ADJUSTMENT = 'difficulty_adjustment',
  PREDICTION_DROPOUT_RISK = 'prediction_dropout_risk',
}

export enum RecommendationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ACCEPTED = 'accepted',
  DISMISSED = 'dismissed',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Python AI Service specific enums
export enum ModelType {
  RECOMMENDATION = 'recommendation',
  CLASSIFICATION = 'classification',
  REGRESSION = 'regression',
  CLUSTERING = 'clustering',
  NLP = 'nlp',
  COMPUTER_VISION = 'computer_vision',
  TIME_SERIES = 'time_series',
  REINFORCEMENT_LEARNING = 'reinforcement_learning',
  ANOMALY_DETECTION = 'anomaly_detection',
  COLLABORATIVE_FILTERING = 'collaborative_filtering',
  CONTENT_BASED = 'content_based',
  HYBRID = 'hybrid',
}

export enum ModelFramework {
  SCIKIT_LEARN = 'scikit_learn',
  TENSORFLOW = 'tensorflow',
  PYTORCH = 'pytorch',
  XGBOOST = 'xgboost',
  LIGHTGBM = 'lightgbm',
  CATBOOST = 'catboost',
  SPACY = 'spacy',
  TRANSFORMERS = 'transformers',
  OPENCV = 'opencv',
  PANDAS = 'pandas',
  NUMPY = 'numpy',
  CUSTOM = 'custom',
}

export enum ModelStatus {
  DEVELOPMENT = 'development',
  TRAINING = 'training',
  TRAINED = 'trained',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production',
  DEPRECATED = 'deprecated',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export enum ModelVersionStatus {
  TRAINING = 'training',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEPLOYED = 'deployed',
  DEPRECATED = 'deprecated',
  TESTING = 'testing',
}

export enum PredictionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

export enum ABTestStatus {
  PLANNED = 'planned',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum DeploymentEnvironment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

export enum ModelServiceStatus {
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

export enum PredictionType {
  // Learning Analytics
  LEARNING_OUTCOME_PREDICTION = 'learning_outcome_prediction',
  DROPOUT_RISK_ASSESSMENT = 'dropout_risk_assessment',
  PERFORMANCE_PREDICTION = 'performance_prediction',
  ENGAGEMENT_PREDICTION = 'engagement_prediction',

  // Content Recommendations
  COURSE_RECOMMENDATION = 'course_recommendation',
  LESSON_RECOMMENDATION = 'lesson_recommendation',
  CONTENT_SIMILARITY = 'content_similarity',
  LEARNING_PATH_OPTIMIZATION = 'learning_path_optimization',

  // Assessment and Grading
  ESSAY_GRADING = 'essay_grading',
  QUESTION_DIFFICULTY_ESTIMATION = 'question_difficulty_estimation',
  CHEATING_DETECTION = 'cheating_detection',
  PLAGIARISM_DETECTION = 'plagiarism_detection',

  // Adaptive Learning
  DIFFICULTY_ADJUSTMENT = 'difficulty_adjustment',
  STUDY_SCHEDULE_OPTIMIZATION = 'study_schedule_optimization',
  LEARNING_STYLE_DETECTION = 'learning_style_detection',
  KNOWLEDGE_TRACING = 'knowledge_tracing',

  // Natural Language Processing
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  CONTENT_CLASSIFICATION = 'content_classification',
  QUESTION_ANSWERING = 'question_answering',
  TEXT_SUMMARIZATION = 'text_summarization',

  // User Behavior Analysis
  BEHAVIOR_PATTERN_RECOGNITION = 'behavior_pattern_recognition',
  INTERACTION_PREDICTION = 'interaction_prediction',
  SESSION_QUALITY_ASSESSMENT = 'session_quality_assessment',
  ATTENTION_MODELING = 'attention_modeling',
}

export enum ModelMetric {
  // Classification Metrics
  ACCURACY = 'accuracy',
  PRECISION = 'precision',
  RECALL = 'recall',
  F1_SCORE = 'f1_score',
  AUC_ROC = 'auc_roc',
  AUC_PR = 'auc_pr',

  // Regression Metrics
  MSE = 'mse',
  RMSE = 'rmse',
  MAE = 'mae',
  R2_SCORE = 'r2_score',
  MAPE = 'mape',

  // Recommendation Metrics
  NDCG = 'ndcg',
  MAP = 'map',
  HIT_RATE = 'hit_rate',
  COVERAGE = 'coverage',
  DIVERSITY = 'diversity',
  NOVELTY = 'novelty',

  // NLP Metrics
  BLEU = 'bleu',
  ROUGE = 'rouge',
  PERPLEXITY = 'perplexity',
  BERT_SCORE = 'bert_score',

  // Custom Business Metrics
  USER_ENGAGEMENT = 'user_engagement',
  LEARNING_IMPROVEMENT = 'learning_improvement',
  COMPLETION_RATE = 'completion_rate',
  SATISFACTION_SCORE = 'satisfaction_score',
}

export enum DataPreprocessingStep {
  CLEANING = 'cleaning',
  NORMALIZATION = 'normalization',
  FEATURE_SCALING = 'feature_scaling',
  FEATURE_SELECTION = 'feature_selection',
  ENCODING = 'encoding',
  IMPUTATION = 'imputation',
  OUTLIER_REMOVAL = 'outlier_removal',
  DIMENSIONALITY_REDUCTION = 'dimensionality_reduction',
  TEXT_PREPROCESSING = 'text_preprocessing',
  IMAGE_PREPROCESSING = 'image_preprocessing',
}

export enum TrainingStrategy {
  BATCH_TRAINING = 'batch_training',
  ONLINE_TRAINING = 'online_training',
  INCREMENTAL_TRAINING = 'incremental_training',
  TRANSFER_LEARNING = 'transfer_learning',
  FINE_TUNING = 'fine_tuning',
  ENSEMBLE_LEARNING = 'ensemble_learning',
  MULTI_TASK_LEARNING = 'multi_task_learning',
  FEDERATED_LEARNING = 'federated_learning',
}

export enum ModelOptimizationTechnique {
  HYPERPARAMETER_TUNING = 'hyperparameter_tuning',
  EARLY_STOPPING = 'early_stopping',
  REGULARIZATION = 'regularization',
  DROPOUT = 'dropout',
  BATCH_NORMALIZATION = 'batch_normalization',
  LEARNING_RATE_SCHEDULING = 'learning_rate_scheduling',
  GRADIENT_CLIPPING = 'gradient_clipping',
  MODEL_PRUNING = 'model_pruning',
  QUANTIZATION = 'quantization',
  KNOWLEDGE_DISTILLATION = 'knowledge_distillation',
}

export enum APIResponseFormat {
  JSON = 'json',
  PROTOBUF = 'protobuf',
  MSGPACK = 'msgpack',
  PICKLE = 'pickle',
}

export enum ModelComputeResource {
  CPU = 'cpu',
  GPU = 'gpu',
  TPU = 'tpu',
  EDGE = 'edge',
}

export enum ModelServingProtocol {
  REST = 'rest',
  GRPC = 'grpc',
  GRAPHQL = 'graphql',
  WEBSOCKET = 'websocket',
}

export enum CacheStrategy {
  NO_CACHE = 'no_cache',
  MEMORY_CACHE = 'memory_cache',
  REDIS_CACHE = 'redis_cache',
  DATABASE_CACHE = 'database_cache',
  HYBRID_CACHE = 'hybrid_cache',
}

export enum ModelExplainabilityMethod {
  LIME = 'lime',
  SHAP = 'shap',
  PERMUTATION_IMPORTANCE = 'permutation_importance',
  FEATURE_IMPORTANCE = 'feature_importance',
  GRAD_CAM = 'grad_cam',
  ATTENTION_VISUALIZATION = 'attention_visualization',
  COUNTERFACTUAL = 'counterfactual',
}
