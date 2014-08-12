class InternalCode:
	def __init__(self, simulator):
		self.user = UserCode()
	
	def measurement_callback(self, t, dt, navdata):
		self.user.measurement_callback(t, dt, navdata)
