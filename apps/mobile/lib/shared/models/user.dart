/// PanelOS user. Plain immutable model — swap for freezed when codegen runs.
class User {
  const User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.organizationId,
  });

  final String id;
  final String email;
  final String name;
  final String role;
  final String? organizationId;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: (json['name'] as String?) ?? '',
      role: (json['role'] as String?) ?? 'technician',
      organizationId: json['organizationId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'email': email,
        'name': name,
        'role': role,
        if (organizationId != null) 'organizationId': organizationId,
      };

  User copyWith({
    String? id,
    String? email,
    String? name,
    String? role,
    String? organizationId,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      role: role ?? this.role,
      organizationId: organizationId ?? this.organizationId,
    );
  }
}
